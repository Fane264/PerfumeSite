import { db } from "./db";
import type { RatingSummary } from "@/types";

/**
 * Aggregate approved-review ratings for a perfume into an average, total count
 * and a 1–5 star distribution, in a single grouped query.
 */
export async function getRatingSummary(
  perfumeId: string,
): Promise<RatingSummary> {
  const grouped = await db.review.groupBy({
    by: ["rating"],
    where: { perfumeId, isApproved: true },
    _count: true,
  });

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let count = 0;
  let weightedSum = 0;

  for (const row of grouped) {
    const star = row.rating;
    if (star >= 1 && star <= 5) {
      distribution[star as 1 | 2 | 3 | 4 | 5] = row._count;
      count += row._count;
      weightedSum += star * row._count;
    }
  }

  return {
    average: count > 0 ? Number((weightedSum / count).toFixed(2)) : 0,
    count,
    distribution,
  };
}
