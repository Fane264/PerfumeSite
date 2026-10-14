import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  /** Percentage change vs the previous period. Omit to hide the delta. */
  change?: number;
  icon: LucideIcon;
}

/** Compute a percentage change, guarding against a zero baseline. */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function StatsCard({ title, value, change, icon: Icon }: StatsCardProps) {
  const hasChange = typeof change === "number";
  const positive = (change ?? 0) >= 0;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="size-4 text-gold" />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hasChange && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            positive ? "text-emerald-500" : "text-red-500",
          )}
        >
          {positive ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          {Math.abs(change ?? 0)}%
          <span className="text-muted-foreground">vs perioada anterioară</span>
        </p>
      )}
    </div>
  );
}
