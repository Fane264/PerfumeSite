"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { formatPrice } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api-client";
import { downloadCsv } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { BulkActions } from "@/components/admin/BulkActions";

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  houseName: string;
  imageUrl: string | null;
  variantCount: number;
  priceMin: number;
  priceMax: number;
  currency: string;
  totalAvailable: number;
  isActive: boolean;
}

export function AdminProductsTable({ rows }: { rows: AdminProductRow[] }) {
  const [products, setProducts] = useState(rows);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const allSelected =
    products.length > 0 && products.every((p) => selected.includes(p.id));

  function toggle(id: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  }

  async function runBulk(action: string) {
    if (action === "export_csv") {
      const chosen = products.filter((p) => selected.includes(p.id));
      downloadCsv(
        `produse-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Nume", "Casă", "Variante", "Preț min", "Preț max", "Stoc", "Activ"],
        chosen.map((p) => [
          p.name,
          p.houseName,
          String(p.variantCount),
          String(p.priceMin),
          String(p.priceMax),
          String(p.totalAvailable),
          p.isActive ? "da" : "nu",
        ]),
      );
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/admin/products/bulk", {
        method: "PATCH",
        body: JSON.stringify({ ids: selected, action }),
      });
      const isActive = action === "activate";
      setProducts((prev) =>
        prev.map((p) => (selected.includes(p.id) ? { ...p, isActive } : p)),
      );
      toast.success(
        action === "delete"
          ? "Produse dezactivate (soft-delete)"
          : isActive
            ? "Produse activate"
            : "Produse dezactivate",
      );
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Operațiune eșuată");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    setSelected(e.target.checked ? products.map((p) => p.id) : [])
                  }
                  aria-label="Selectează toate produsele"
                  className="size-4 accent-gold"
                />
              </th>
              <th className="p-3 font-medium">Parfum</th>
              <th className="p-3 font-medium">Casă</th>
              <th className="p-3 font-medium">Variante</th>
              <th className="p-3 font-medium">Preț</th>
              <th className="p-3 font-medium">Stoc disponibil</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) => toggle(p.id, e.target.checked)}
                    aria-label={`Selectează ${p.name}`}
                    className="size-4 accent-gold"
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded bg-muted">
                      {p.imageUrl && (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{p.houseName}</td>
                <td className="p-3 text-muted-foreground">{p.variantCount}</td>
                <td className="p-3">
                  {p.priceMin === p.priceMax
                    ? formatPrice(p.priceMin, p.currency)
                    : `${formatPrice(p.priceMin, p.currency)} – ${formatPrice(p.priceMax, p.currency)}`}
                </td>
                <td className="p-3">
                  <Badge
                    variant={
                      p.totalAvailable === 0
                        ? "destructive"
                        : p.totalAvailable < 10
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {p.totalAvailable} buc.
                  </Badge>
                </td>
                <td className="p-3">
                  <ProductActiveToggle slug={p.slug} initialActive={p.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BulkActions
        selectedIds={selected}
        busy={busy}
        actions={[
          { id: "activate", label: "Activează" },
          { id: "deactivate", label: "Dezactivează" },
          { id: "delete", label: "Șterge (soft)", variant: "danger" },
          { id: "export_csv", label: "Export CSV" },
        ]}
        onAction={runBulk}
        onClear={() => setSelected([])}
      />
    </>
  );
}
