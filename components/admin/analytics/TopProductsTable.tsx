import Image from "next/image";
import { Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { AdminAnalytics } from "@/types";

interface TopProductsTableProps {
  products: AdminAnalytics["topPerfumes"];
  currency: string;
}

export function TopProductsTable({ products, currency }: TopProductsTableProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-5">
        <h2 className="font-medium">Bestsellers lunii</h2>
      </div>
      {products.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          Nicio vânzare în această perioadă.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Produs</th>
              <th className="p-3 font-medium">Casă</th>
              <th className="p-3 text-right font-medium">Bucăți</th>
              <th className="p-3 text-right font-medium">Venit</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded bg-muted">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-muted-foreground">
                          <Package className="size-4" />
                        </span>
                      )}
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{p.houseName}</td>
                <td className="p-3 text-right">{p.unitsSold}</td>
                <td className="p-3 text-right">
                  {formatPrice(p.revenue, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
