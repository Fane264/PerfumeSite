"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Wallet,
  ShoppingBag,
  UserPlus,
  Repeat,
  AlertTriangle,
} from "lucide-react";
import { adminAnalyticsApi } from "@/lib/api-client";
import { cn, formatPrice } from "@/lib/utils";
import type { AnalyticsPeriod } from "@/types";
import { RevenueChart } from "./RevenueChart";
import { OrderStatusChart } from "./OrderStatusChart";
import { TopProductsTable } from "./TopProductsTable";
import { StatsCard, percentChange } from "./StatsCard";

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d", label: "7Z" },
  { value: "30d", label: "30Z" },
  { value: "90d", label: "3L" },
  { value: "12m", label: "12L" },
];

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-analytics", period],
    queryFn: () => adminAnalyticsApi.get(period),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <div className="inline-flex rounded-lg border bg-card p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                period === opt.value
                  ? "bg-gold text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="size-6 animate-spin text-gold" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nu am putut încărca datele analitice.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Venit"
              value={formatPrice(data.revenue.total, data.revenue.currency)}
              change={percentChange(data.revenue.total, data.revenue.previous)}
              icon={Wallet}
            />
            <StatsCard
              title="Comenzi"
              value={String(data.orders.total)}
              change={percentChange(data.orders.total, data.orders.previous)}
              icon={ShoppingBag}
            />
            <StatsCard
              title="Clienți noi"
              value={String(data.customers.new)}
              icon={UserPlus}
            />
            <StatsCard
              title="Clienți fideli"
              value={String(data.customers.returning)}
              icon={Repeat}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <RevenueChart data={data.revenue.byDay} currency={data.revenue.currency} />
            <OrderStatusChart byStatus={data.orders.byStatus} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <TopProductsTable
              products={data.topPerfumes}
              currency={data.revenue.currency}
            />

            <div className="space-y-6">
              <div className="rounded-xl border bg-card">
                <div className="border-b p-5">
                  <h2 className="font-medium">Top case</h2>
                </div>
                {data.topHouses.length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">
                    Nicio vânzare în această perioadă.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {data.topHouses.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center justify-between p-4 text-sm"
                      >
                        <span>
                          <span className="font-medium">{h.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {h.orderCount} comenzi
                          </span>
                        </span>
                        <span className="text-gold">
                          {formatPrice(h.revenue, data.revenue.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border bg-card">
                <div className="flex items-center gap-2 border-b p-5">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <h2 className="font-medium">Stoc redus</h2>
                </div>
                {data.lowStock.length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">
                    Toate produsele au stoc suficient.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {data.lowStock.slice(0, 6).map((item) => (
                      <li
                        key={item.variantId}
                        className="flex items-center justify-between p-4 text-sm"
                      >
                        <span>
                          {item.perfumeName}{" "}
                          <span className="text-muted-foreground">
                            ({item.sizeML} ml)
                          </span>
                        </span>
                        <span
                          className={cn(
                            "rounded-sm border px-2 py-0.5 text-xs",
                            item.quantity === 0
                              ? "border-red-500/30 bg-red-500/10 text-red-400"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-400",
                          )}
                        >
                          {item.quantity} buc.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
