import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { perfumeListArgs } from "@/types";
import { availableStock } from "@/lib/utils";
import { priceRangeFromVariants } from "@/lib/serializers";
import {
  AdminProductsTable,
  type AdminProductRow,
} from "@/components/admin/admin-products-table";

export const metadata: Metadata = { title: "Admin · Produse" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const perfumes = await db.perfume.findMany({
    ...perfumeListArgs,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const rows: AdminProductRow[] = perfumes.map((perfume) => {
    const totalAvailable = perfume.variants.reduce(
      (sum, v) =>
        sum +
        availableStock(
          v.inventory?.quantity ?? 0,
          v.inventory?.reservedQuantity ?? 0,
        ),
      0,
    );
    const range = priceRangeFromVariants(perfume.variants);
    return {
      id: perfume.id,
      name: perfume.name,
      slug: perfume.slug,
      houseName: perfume.house.name,
      imageUrl: perfume.images[0]?.url ?? null,
      variantCount: perfume.variants.length,
      priceMin: range.min,
      priceMax: range.max,
      currency: range.currency,
      totalAvailable,
      isActive: perfume.isActive,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Produse</h1>
          <span className="text-sm text-muted-foreground">
            {perfumes.length} parfumuri
          </span>
        </div>
        <Link
          href="/admin/produse/nou"
          className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-gold-light"
        >
          <Plus className="size-4" /> Adaugă produs
        </Link>
      </div>

      <AdminProductsTable rows={rows} />
    </div>
  );
}
