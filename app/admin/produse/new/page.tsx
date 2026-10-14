import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Admin · Adaugă produs" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [houses, families, notes] = await Promise.all([
    db.perfumeHouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.olfactoryFamily.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.olfactoryNote.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/produse"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Înapoi la produse
      </Link>
      <h1 className="font-serif text-3xl">Adaugă produs</h1>
      <ProductForm houses={houses} families={families} notes={notes} />
    </div>
  );
}
