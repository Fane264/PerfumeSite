"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@/lib/utils";

interface RevenueChartProps {
  data: { date: string; amount: number }[];
  currency: string;
}

/** Format a bucket key (YYYY-MM-DD or YYYY-MM) into a short axis label. */
function formatAxisDate(value: string): string {
  if (value.length === 7) {
    // Monthly bucket → short month name.
    const [y, m] = value.split("-").map(Number);
    return new Date(Date.UTC(y!, (m ?? 1) - 1, 1)).toLocaleDateString("ro-RO", {
      month: "short",
    });
  }
  const [, m, d] = value.split("-");
  return `${d}.${m}`;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string | number;
  currency: string;
}

function ChartTooltip({ active, payload, label, currency }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[#2A2A2A] bg-[#111] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-muted-foreground">{formatAxisDate(String(label))}</p>
      <p className="font-medium text-gold">
        {formatPrice(payload[0]?.value ?? 0, currency)}
      </p>
    </div>
  );
}

export function RevenueChart({ data, currency }: RevenueChartProps) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="mb-4 font-medium">Venituri</h2>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatAxisDate}
              tick={{ fill: "#9A9088", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#2A2A2A" }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "#9A9088", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => `${Math.round(v)}`}
            />
            <Tooltip
              content={<ChartTooltip currency={currency} />}
              cursor={{ stroke: "#C9A84C", strokeOpacity: 0.3 }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#C9A84C"
              strokeWidth={2}
              fill="url(#revenueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
