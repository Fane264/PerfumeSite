import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/preorders/my — the current user's pre-orders, newest first.
export async function GET() {
  try {
    const user = await requireAuth();

    const preOrders = await db.preOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        variant: {
          select: {
            sizeML: true,
            price: true,
            perfume: {
              select: {
                name: true,
                slug: true,
                house: { select: { name: true } },
                images: {
                  where: { isPrimary: true },
                  select: { url: true, altText: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const data = preOrders.map((p) => ({
      id: p.id,
      status: p.status,
      quantity: p.quantity,
      expectedDate: p.expectedDate?.toISOString() ?? null,
      fulfilledAt: p.fulfilledAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      sizeML: p.variant.sizeML.toNumber(),
      unitPrice: p.variant.price.toNumber(),
      perfumeName: p.variant.perfume.name,
      perfumeSlug: p.variant.perfume.slug,
      houseName: p.variant.perfume.house.name,
      imageUrl: p.variant.perfume.images[0]?.url ?? null,
    }));

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
