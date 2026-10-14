import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import {
  ReviewModeration,
  type AdminReview,
} from "@/components/admin/review-moderation";

export const metadata: Metadata = { title: "Admin · Recenzii" };
export const dynamic = "force-dynamic";

type Filter = "all" | "pending" | "approved";

const TABS: { id: Filter; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "pending", label: "În așteptare" },
  { id: "approved", label: "Aprobate" },
];

function whereFor(filter: Filter): Prisma.ReviewWhereInput {
  if (filter === "pending") return { isApproved: false };
  if (filter === "approved") return { isApproved: true };
  return {};
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const filter: Filter =
    searchParams.status === "pending" || searchParams.status === "approved"
      ? searchParams.status
      : "all";

  const [rows, pendingCount, approvedCount, totalCount] = await Promise.all([
    db.review.findMany({
      where: whereFor(filter),
      include: {
        user: { select: { email: true } },
        perfume: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.review.count({ where: { isApproved: false } }),
    db.review.count({ where: { isApproved: true } }),
    db.review.count(),
  ]);

  const reviews: AdminReview[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    isApproved: r.isApproved,
    isVerifiedPurchase: r.isVerifiedPurchase,
    createdAt: r.createdAt.toISOString(),
    authorEmail: r.user.email,
    perfumeName: r.perfume.name,
  }));

  const counts: Record<Filter, number> = {
    all: totalCount,
    pending: pendingCount,
    approved: approvedCount,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Recenzii</h1>
        <p className="text-sm text-muted-foreground">
          {pendingCount} în așteptarea moderării
        </p>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map((tab) => {
          const active = filter === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/admin/recenzii${tab.id === "all" ? "" : `?status=${tab.id}`}`}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors",
                active
                  ? "border-gold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}{" "}
              <span className="text-xs text-muted-foreground">
                ({counts[tab.id]})
              </span>
            </Link>
          );
        })}
      </div>

      <ReviewModeration reviews={reviews} />
    </div>
  );
}
