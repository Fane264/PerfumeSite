"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

interface OrderStatusChartProps {
  byStatus: Record<OrderStatus, number>;
}

// Distinct slice color per order status.
const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "#F59E0B",
  PENDING_COD: "#FBBF24",
  PAID: "#3B82F6",
  PAID_COD: "#10B981",
  PROCESSING: "#0EA5E9",
  SHIPPED: "#6366F1",
  DELIVERED: "#22C55E",
  CANCELLED: "#EF4444",
  REFUNDED: "#A855F7",
};

export function OrderStatusChart({ byStatus }: OrderStatusChartProps) {
  const { slices, total } = useMemo(() => {
    const entries = (Object.keys(byStatus) as OrderStatus[])
      .map((status) => ({
        status,
        name: ORDER_STATUS_LABEL[status],
        value: byStatus[status],
        color: STATUS_COLOR[status],
      }))
      .filter((s) => s.value > 0);
    return {
      slices: entries,
      total: entries.reduce((sum, s) => sum + s.value, 0),
    };
  }, [byStatus]);

  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="mb-4 font-medium">Comenzi după status</h2>
      {total === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nicio comandă în această perioadă.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={2}
                  stroke="none"
                >
                  {slices.map((s) => (
                    <Cell key={s.status} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid #2A2A2A",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold">{total}</span>
              <span className="text-xs text-muted-foreground">comenzi</span>
            </div>
          </div>

          <ul className="flex-1 space-y-2">
            {slices.map((s) => (
              <li
                key={s.status}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-muted-foreground">{s.name}</span>
                </span>
                <span className="font-medium">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
