import { NextRequest } from "next/server";
import { WholesaleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { wholesaleApplySchema } from "@/lib/validations/wholesale";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import { sendRawEmail } from "@/lib/resend";
import { env } from "@/lib/env";
import { APP_URL } from "@/lib/constants";

export const runtime = "nodejs";

// POST /api/wholesale/apply — submit a B2B account application (one per user).
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const input = wholesaleApplySchema.parse(await req.json());

    const existing = await db.wholesaleAccount.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });
    if (existing) {
      return apiError(
        existing.status === WholesaleStatus.ACTIVE
          ? "Ai deja un cont wholesale activ"
          : "Ai deja o cerere wholesale înregistrată",
        409,
      );
    }

    const account = await db.wholesaleAccount.create({
      data: {
        userId: user.id,
        companyName: input.companyName,
        cui: input.cui ?? null,
        website: input.website ?? null,
        notes: input.message ?? null,
      },
    });

    // Notify the admin (best-effort).
    if (env.ADMIN_EMAIL) {
      try {
        await sendRawEmail(
          env.ADMIN_EMAIL,
          `Cerere wholesale nouă — ${input.companyName}`,
          `<h2>Cerere wholesale nouă</h2>
           <p><strong>Companie:</strong> ${input.companyName}</p>
           <p><strong>CUI:</strong> ${input.cui ?? "—"}</p>
           <p><strong>Website:</strong> ${input.website ?? "—"}</p>
           <p><strong>Email cont:</strong> ${user.email}</p>
           <p><strong>Mesaj:</strong> ${input.message ?? "—"}</p>
           <p><a href="${APP_URL}/admin/wholesale">Gestionează cererile</a></p>`,
        );
      } catch (err) {
        console.error("[Wholesale apply] admin email failed:", err);
      }
    }

    return apiSuccess(
      { id: account.id, status: account.status },
      undefined,
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
