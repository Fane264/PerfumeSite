import { NextRequest } from "next/server";
import { UserRole, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";
import { generateInvoicePDF } from "@/lib/invoice";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// Invoices are only issued once an order has been paid or fulfilled.
const INVOICEABLE: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PAID_COD,
  OrderStatus.DELIVERED,
];

// GET /api/orders/[id]/invoice — download the order's PDF invoice. Owner or
// admin only.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth();

    const order = await db.order.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, status: true, orderNumber: true },
    });
    if (!order) return apiError("Comanda nu a fost găsită", 404);

    const isAdmin = user.role === UserRole.ADMIN;
    if (order.userId !== user.id && !isAdmin) {
      throw new ForbiddenError("Nu ai acces la această comandă");
    }

    if (!isAdmin && !INVOICEABLE.includes(order.status)) {
      return apiError("Factura nu este disponibilă pentru această comandă", 400);
    }

    const pdf = await generateInvoicePDF(order.id);

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="factura-${order.orderNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
