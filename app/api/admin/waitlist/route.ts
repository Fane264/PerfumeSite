import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/admin/waitlist — perfumes that are coming soon / waitlist-open, with
// signup + pre-order counts for the launches admin dashboard.
export async function GET() {
  try {
    await requireAdmin();

    const perfumes = await db.perfume.findMany({
      where: {
        OR: [
          { isComingSoon: true },
          { waitlistOpen: true },
          { preOrderOpen: true },
          { waitlist: { some: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isComingSoon: true,
        waitlistOpen: true,
        preOrderOpen: true,
        launchDate: true,
        house: { select: { name: true } },
        _count: { select: { waitlist: true } },
        variants: { select: { id: true } },
      },
      orderBy: [{ launchDate: "asc" }, { name: "asc" }],
    });

    const variantIds = perfumes.flatMap((p) => p.variants.map((v) => v.id));
    const preOrderGroups = variantIds.length
      ? await db.preOrder.groupBy({
          by: ["variantId"],
          where: { variantId: { in: variantIds } },
          _count: { _all: true },
        })
      : [];
    const notifiedGroups = await db.waitlistEntry.groupBy({
      by: ["perfumeId"],
      where: { notifiedAt: { not: null } },
      _count: { _all: true },
    });

    const preOrderByVariant = new Map(
      preOrderGroups.map((g) => [g.variantId, g._count._all]),
    );
    const notifiedByPerfume = new Map(
      notifiedGroups.map((g) => [g.perfumeId, g._count._all]),
    );

    const data = perfumes.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      houseName: p.house.name,
      isComingSoon: p.isComingSoon,
      waitlistOpen: p.waitlistOpen,
      preOrderOpen: p.preOrderOpen,
      launchDate: p.launchDate?.toISOString() ?? null,
      waitlistCount: p._count.waitlist,
      notifiedCount: notifiedByPerfume.get(p.id) ?? 0,
      preOrderCount: p.variants.reduce(
        (sum, v) => sum + (preOrderByVariant.get(v.id) ?? 0),
        0,
      ),
    }));

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
