"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download, ArrowUpDown } from "lucide-react";
import {
  adminInventoryApi,
  type ForecastItem,
  type ForecastStatus,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";

const STATUS_META: Record<
  ForecastStatus,
  { label: string; card: string; badge: string; bar: string }
> = {
  critical: {
    label: "Critical",
    card: "border-red-200 bg-red-50 text-red-700",
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-500",
  },
  reorder_soon: {
    label: "Reorder Soon",
    card: "border-amber-200 bg-amber-50 text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
  },
  ok: {
    label: "OK",
    card: "border-emerald-200 bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
  },
  overstocked: {
    label: "Overstocked",
    card: "border-sky-200 bg-sky-50 text-sky-700",
    badge: "bg-sky-100 text-sky-700",
    bar: "bg-sky-500",
  },
};

type SortKey = "daysUntilStockout" | "currentStock" | "avgUnitsPerDay" | "recommendedReorder";

export function InventoryForecastView() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "inventory-forecast"],
    queryFn: adminInventoryApi.forecast,
    refetchInterval: 5 * 60 * 1000,
  });

  const [sortKey, setSortKey] = useState<SortKey>("daysUntilStockout");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    if (!data) return [];
    const big = Number.POSITIVE_INFINITY;
    const val = (i: ForecastItem) =>
      sortKey === "daysUntilStockout"
        ? (i.daysUntilStockout ?? big)
        : i[sortKey];
    return [...data.items].sort((a, b) => {
      const diff = (val(a) as number) - (val(b) as number);
      return asc ? diff : -diff;
    });
  }, [data, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  function exportCsv() {
    if (!data) return;
    const header = [
      "SKU",
      "Parfum",
      "Casa",
      "Marime (ml)",
      "Stoc curent",
      "Vanzari/zi",
      "Zile pana la 0",
      "Reorder recomandat",
      "Status",
    ];
    const rows = data.items.map((i) => [
      i.sku,
      i.perfumeName,
      i.houseName,
      i.sizeML,
      i.currentStock,
      i.avgUnitsPerDay,
      i.daysUntilStockout ?? "∞",
      i.recommendedReorder,
      i.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventar-forecast-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(STATUS_META) as ForecastStatus[]).map((status) => (
          <div
            key={status}
            className={`rounded-lg border p-5 ${STATUS_META[status].card}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide">
              {STATUS_META[status].label}
            </p>
            <p className="mt-2 text-3xl font-semibold">{data.summary[status]}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={exportCsv}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Produs</th>
              <SortableTh onClick={() => toggleSort("currentStock")}>Stoc</SortableTh>
              <SortableTh onClick={() => toggleSort("avgUnitsPerDay")}>
                Vânzări/zi
              </SortableTh>
              <SortableTh onClick={() => toggleSort("daysUntilStockout")}>
                Zile până la 0
              </SortableTh>
              <SortableTh onClick={() => toggleSort("recommendedReorder")}>
                Reorder
              </SortableTh>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((item) => {
              const meta = STATUS_META[item.status];
              const days = item.daysUntilStockout;
              const pct =
                days === null ? 100 : Math.min(100, (days / 90) * 100);
              return (
                <tr key={item.variantId}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.perfumeName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.houseName} · {item.sizeML} ml · {item.sku}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{item.currentStock}</td>
                  <td className="px-4 py-3 tabular-nums">{item.avgUnitsPerDay}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-12 tabular-nums">
                        {days === null ? "∞" : days}
                      </span>
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-200">
                        <span
                          className={`block h-full ${meta.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {item.recommendedReorder > 0 ? `+${item.recommendedReorder}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Nicio variantă activă.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableTh({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 transition-colors hover:text-foreground"
      >
        {children}
        <ArrowUpDown className="size-3" />
      </button>
    </th>
  );
}
