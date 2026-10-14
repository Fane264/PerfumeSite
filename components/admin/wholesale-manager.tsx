"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  adminWholesaleApi,
  ApiError,
  type AdminWholesaleRow,
} from "@/lib/api-client";

type Tab = "PENDING" | "ACTIVE" | "SUSPENDED";

export function WholesaleManager() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("PENDING");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "wholesale"],
    queryFn: adminWholesaleApi.list,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof adminWholesaleApi.update>[1];
    }) => adminWholesaleApi.update(id, body),
    onSuccess: () => {
      toast.success("Cont actualizat");
      qc.invalidateQueries({ queryKey: ["admin", "wholesale"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Actualizarea a eșuat"),
  });

  const rows = useMemo(
    () => (data ?? []).filter((r) => r.status === tab),
    [data, tab],
  );

  const totalRevenue = useMemo(
    () => (data ?? []).reduce((sum, r) => sum + r.totalRevenue, 0),
    [data],
  );

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { PENDING: 0, ACTIVE: 0, SUSPENDED: 0 };
    for (const r of data ?? []) c[r.status] += 1;
    return c;
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Conturi active" value={String(counts.ACTIVE)} />
        <Stat label="Cereri noi" value={String(counts.PENDING)} />
        <Stat
          label="Venit wholesale"
          value={`${totalRevenue.toLocaleString("ro-RO")} RON`}
        />
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["PENDING", "ACTIVE", "SUSPENDED"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "PENDING" ? "Cereri noi" : t === "ACTIVE" ? "Activi" : "Suspendați"}{" "}
            ({counts[t]})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          Niciun cont în această categorie.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <WholesaleCard key={row.id} row={row} onUpdate={update.mutate} busy={update.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function WholesaleCard({
  row,
  onUpdate,
  busy,
}: {
  row: AdminWholesaleRow;
  onUpdate: (args: {
    id: string;
    body: Parameters<typeof adminWholesaleApi.update>[1];
  }) => void;
  busy: boolean;
}) {
  const [rate, setRate] = useState(Math.round(row.discountRate * 100));

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{row.companyName}</h3>
          <p className="text-sm text-muted-foreground">
            {row.contactName ? `${row.contactName} · ` : ""}
            {row.email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            CUI: {row.cui ?? "—"}
            {row.website && (
              <>
                {" · "}
                <a
                  href={row.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  website
                </a>
              </>
            )}
            {" · "}
            {row.orderCount} comenzi · {row.totalRevenue.toLocaleString("ro-RO")} RON
          </p>
          {row.notes && (
            <p className="mt-2 max-w-prose text-sm italic text-muted-foreground">
              „{row.notes}”
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            Discount
            <input
              type="number"
              min={0}
              max={90}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-right text-sm"
            />
            %
          </label>
          <div className="flex gap-2">
            {row.status !== "ACTIVE" && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onUpdate({
                    id: row.id,
                    body: { status: "ACTIVE", discountRate: rate / 100 },
                  })
                }
                className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Aprobă
              </button>
            )}
            {row.status === "ACTIVE" && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    onUpdate({ id: row.id, body: { discountRate: rate / 100 } })
                  }
                  className="rounded-md border border-primary px-3 py-1.5 text-xs text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  Salvează discount
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    onUpdate({ id: row.id, body: { status: "SUSPENDED" } })
                  }
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  Suspendă
                </button>
              </>
            )}
            {row.status === "SUSPENDED" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onUpdate({ id: row.id, body: { status: "ACTIVE" } })}
                className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Reactivează
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
