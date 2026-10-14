import type { Metadata } from "next";
import { db } from "@/lib/db";
import { availableStock } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin · Stoc" };
export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const inventories = await db.inventory.findMany({
    where: { variant: { isActive: true } },
    include: {
      variant: {
        include: { perfume: { select: { name: true, slug: true } } },
      },
    },
  });

  const rows = inventories
    .map((inv) => ({
      variantId: inv.variantId,
      sku: inv.variant.sku,
      perfumeName: inv.variant.perfume.name,
      sizeML: inv.variant.sizeML.toNumber(),
      quantity: inv.quantity,
      reserved: inv.reservedQuantity,
      available: availableStock(inv.quantity, inv.reservedQuantity),
      threshold: inv.lowStockThreshold,
    }))
    .sort((a, b) => a.available - b.available);

  const lowCount = rows.filter((r) => r.available <= r.threshold).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Gestionare stoc</h1>
        <span className="text-sm text-muted-foreground">
          {lowCount} variante cu stoc redus
        </span>
      </div>

      <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        Ajustează stocul prin <code>POST /api/admin/inventory</code> cu{" "}
        <code>{`{ variantId, quantity, operation: "SET" | "ADD" | "SUBTRACT" }`}</code>
        . Alertele de restock sunt trimise automat când stocul revine.
      </p>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Parfum</th>
              <th className="p-3 font-medium">Mărime</th>
              <th className="p-3 font-medium">În stoc</th>
              <th className="p-3 font-medium">Rezervat</th>
              <th className="p-3 font-medium">Disponibil</th>
              <th className="p-3 font-medium">Prag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.variantId} className="border-b last:border-0">
                <td className="p-3 font-mono text-xs">{row.sku}</td>
                <td className="p-3">{row.perfumeName}</td>
                <td className="p-3 text-muted-foreground">{row.sizeML} ml</td>
                <td className="p-3">{row.quantity}</td>
                <td className="p-3 text-muted-foreground">{row.reserved}</td>
                <td className="p-3">
                  <Badge
                    variant={
                      row.available === 0
                        ? "destructive"
                        : row.available <= row.threshold
                          ? "warning"
                          : "success"
                    }
                  >
                    {row.available}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{row.threshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
