import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { withRatings } from "@/lib/catalog";
import { perfumeListArgs } from "@/types";
import { PerfumeCard } from "@/components/shop/perfume-card";

type RouteParams = { params: { userId: string } };

async function getWishlist(userId: string) {
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { firstName: true },
  });
  if (!user) return null;

  const items = await db.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { perfume: perfumeListArgs },
  });
  const perfumes = items
    .map((item) => item.perfume)
    .filter((p) => p.isActive);

  return { firstName: user.firstName, perfumes: await withRatings(perfumes) };
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const data = await getWishlist(params.userId);
  if (!data) return { title: "Listă negăsită", robots: { index: false } };
  const owner = data.firstName ?? "Un client";
  const title = `Lista de dorințe a lui ${owner}`;
  const description = `Descoperă decanturile de nișă din lista de dorințe a lui ${owner}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function PublicWishlistPage({ params }: RouteParams) {
  const data = await getWishlist(params.userId);
  if (!data) notFound();

  const owner = data.firstName ?? "Un client";

  return (
    <div className="container py-28 md:py-32">
      <div className="mb-12 text-center">
        <p className="text-xs uppercase tracking-luxe text-gold">
          Listă de dorințe
        </p>
        <h1 className="mt-2 font-serif text-4xl font-light text-cream md:text-5xl">
          {owner}&apos;s Lista de Dorințe
        </h1>
      </div>

      {data.perfumes.length === 0 ? (
        <div className="border border-dashed border-border py-20 text-center">
          <p className="font-serif text-2xl font-light text-cream">
            Lista este goală
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.perfumes.map((perfume) => (
            <PerfumeCard key={perfume.id} perfume={perfume} />
          ))}
        </div>
      )}
    </div>
  );
}
