import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { withRatings } from "@/lib/catalog";
import { perfumeListArgs } from "@/types";
import { PerfumeCard } from "@/components/shop/perfume-card";

export const metadata: Metadata = {
  title: "Pagina nu există",
  robots: { index: false, follow: false },
};

// Fetch a few featured products to suggest on the 404 page.
async function getSuggestions() {
  const rows = await db.perfume.findMany({
    where: { isActive: true, isFeatured: true },
    ...perfumeListArgs,
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  // Light shuffle so the 404 page feels alive across visits.
  const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, 3);
  return withRatings(shuffled);
}

export default async function NotFound() {
  const suggestions = await getSuggestions().catch(() => []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container flex flex-col items-center py-28 text-center md:py-36">
        <p className="font-serif text-[6rem] font-light leading-none text-gold md:text-[9rem]">
          404
        </p>
        <h1 className="mt-2 font-serif text-3xl font-light text-cream md:text-4xl">
          Pagina nu există
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Pagina căutată a fost mutată sau nu a existat niciodată. Explorează
          colecția noastră de decanturi de nișă.
        </p>
        <Link
          href="/parfumuri"
          className="mt-8 inline-block bg-gold px-8 py-3 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
        >
          Explorează colecția
        </Link>

        {suggestions.length > 0 && (
          <div className="mt-20 w-full text-left">
            <p className="mb-8 text-center text-xs uppercase tracking-luxe text-gold">
              Poate te interesează
            </p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((perfume) => (
                <PerfumeCard key={perfume.id} perfume={perfume} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
