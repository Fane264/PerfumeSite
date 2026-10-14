import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import { createReturnSchema } from "@/lib/validations/return";
import {
  canRequestReturn,
  calculateRefundAmount,
  generateReturnNumber,
  returnInclude,
  serializeReturn,
} from "@/lib/returns";
import {
  sendReturnRequestedEmail,
  sendReturnAdminEmail,
  type ReturnEmailItem,
} from "@/lib/resend";
import { env } from "@/lib/env";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";

const ELIGIBILITY_MESSAGE: Record<string, string> = {
  not_delivered: "Comanda nu este eligibilă pentru retur (nelivrată)",
  already_returned: "Există deja o cerere de retur pentru această comandă",
  outside_window: "Perioada de retur de 14 zile a expirat",
};

// GET /api/returns — the current user's return requests.
export async function GET() {
  try {
    const user = await requireAuth();
    const returns = await db.returnRequest.findMany({
      where: { userId: user.id },
      include: returnInclude,
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(returns.map(serializeReturn));
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/returns — initiate a return request for a delivered order.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const input = createReturnSchema.parse(await req.json());

    const eligibility = await canRequestReturn(input.orderId, user.id);
    if (!eligibility.eligible) {
      return apiError(
        ELIGIBILITY_MESSAGE[eligibility.reason ?? "not_delivered"] ??
          "Comanda nu este eligibilă pentru retur",
        422,
      );
    }

    const order = await db.order.findFirst({
      where: { id: input.orderId, userId: user.id },
      include: { items: true },
    });
    if (!order) return apiError("Comanda nu a fost găsită", 404);

    // Validate every requested item belongs to the order and the quantity is
    // within what was purchased.
    const orderItemsById = new Map(order.items.map((i) => [i.id, i]));
    for (const item of input.items) {
      const orderItem = orderItemsById.get(item.orderItemId);
      if (!orderItem) {
        return apiError("Unul dintre produse nu aparține acestei comenzi", 422);
      }
      if (item.quantity > orderItem.quantity) {
        return apiError(
          `Cantitate prea mare pentru ${orderItem.perfumeNameAtPurchase}`,
          422,
        );
      }
    }

    const refundAmount = calculateRefundAmount(input.items, order.items);

    const created = await db.returnRequest.create({
      data: {
        orderId: order.id,
        userId: user.id,
        reason: input.reason,
        description: input.description,
        refundAmount,
        items: {
          create: input.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: returnInclude,
    });

    const emailItems: ReturnEmailItem[] = created.items.map((item) => ({
      perfumeName: item.orderItem.perfumeNameAtPurchase,
      houseName: item.orderItem.houseNameAtPurchase,
      sizeML: toNumber(item.orderItem.sizeMLAtPurchase),
      quantity: item.quantity,
    }));
    const returnNumber = generateReturnNumber(created.id);
    const customerName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || "client";

    // Best-effort notifications — never fail the request on email errors.
    try {
      await sendReturnRequestedEmail(user.email, {
        customerName,
        returnNumber,
        orderNumber: order.orderNumber,
        items: emailItems,
      });
      if (env.ADMIN_EMAIL) {
        await sendReturnAdminEmail(env.ADMIN_EMAIL, {
          returnNumber,
          orderNumber: order.orderNumber,
          customerName,
          reason: input.reason,
          items: emailItems,
        });
      }
    } catch (err) {
      console.error("[returns] notification failed:", err);
    }

    return apiSuccess(serializeReturn(created), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
