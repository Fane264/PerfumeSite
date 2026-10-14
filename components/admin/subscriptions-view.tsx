"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, TrendingUp, TrendingDown, Truck } from "lucide-react";
import { adminSubscriptionsApi } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAST_DUE: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-zinc-200 text-zinc-600",
  PAUSED: "bg-sky-100 text-sky-700",
};

export function AdminSubscriptionsView() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: adminSubscriptionsApi.list,
  });
  const [tab, setTab] = useState<"subscribers" | "boxes">("subscribers");

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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="size-5" />}
          label="Abonați activi"
          value={data.stats.activeCount.toString()}
          tone="text-emerald-600"
        />
        <StatCard
          icon={<TrendingUp className="size-5" />}
          label="MRR"
          value={formatPrice(data.stats.mrr)}
          tone="text-gold"
        />
        <StatCard
          icon={<TrendingDown className="size-5" />}
          label="Churn luna aceasta"
          value={data.stats.churnThisMonth.toString()}
          tone="text-destructive"
        />
      </div>

      <div className="flex gap-2 border-b">
        <TabButton active={tab === "subscribers"} onClick={() => setTab("subscribers")}>
          Abonați ({data.subscriptions.length})
        </TabButton>
        <TabButton active={tab === "boxes"} onClick={() => setTab("boxes")}>
          Box-uri luna aceasta ({data.boxesThisMonth.length})
        </TabButton>
      </div>

      {tab === "subscribers" ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Utilizator</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Început</th>
                <th className="px-4 py-3">Următoarea facturare</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.subscriptions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <div>{s.user}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="px-4 py-3">{s.plan}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[s.status]}`}
                    >
                      {s.status}
                    </span>
                    {s.cancelAtPeriodEnd && (
                      <span className="ml-1 text-xs text-amber-600">(se oprește)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.startedAt).toLocaleDateString("ro-RO")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.nextBilling).toLocaleDateString("ro-RO")}
                  </td>
                </tr>
              ))}
              {data.subscriptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Niciun abonat încă.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <BoxesTab boxes={data.boxesThisMonth} />
      )}
    </div>
  );
}

function BoxesTab({
  boxes,
}: {
  boxes: { id: string; user: string; plan: string; status: string; trackingNumber: string | null }[];
}) {
  const queryClient = useQueryClient();
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status?: string; trackingNumber?: string | null } }) =>
      adminSubscriptionsApi.updateBox(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] }),
  });

  if (boxes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        Nicio cutie programată pentru luna aceasta.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {boxes.map((box) => (
        <div
          key={box.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-4"
        >
          <div>
            <p className="font-medium">{box.user}</p>
            <p className="text-xs text-muted-foreground">
              {box.plan} · {box.status}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="AWB"
              value={tracking[box.id] ?? box.trackingNumber ?? ""}
              onChange={(e) =>
                setTracking((t) => ({ ...t, [box.id]: e.target.value }))
              }
              className="h-9 w-36"
            />
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  id: box.id,
                  body: {
                    status: "SHIPPED",
                    trackingNumber: tracking[box.id] ?? box.trackingNumber ?? null,
                  },
                })
              }
            >
              <Truck className="size-4" /> Marchează expediat
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-5">
      <div className={`flex items-center gap-2 ${tone}`}>
        {icon}
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm transition-colors ${
        active
          ? "border-gold font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
