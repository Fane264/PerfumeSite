"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, BellRing, PackageCheck } from "lucide-react";
import toast from "react-hot-toast";
import { adminLaunchesApi, ApiError, type AdminLaunchRow } from "@/lib/api-client";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        checked
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-accent"
      }`}
    >
      {label}: {checked ? "DA" : "NU"}
    </button>
  );
}

export function LaunchesManager() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "launches"],
    queryFn: adminLaunchesApi.list,
  });

  const flagMutation = useMutation({
    mutationFn: ({
      perfumeId,
      body,
    }: {
      perfumeId: string;
      body: Partial<Pick<AdminLaunchRow, "isComingSoon" | "waitlistOpen" | "preOrderOpen">>;
    }) => adminLaunchesApi.setFlags(perfumeId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "launches"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Actualizarea a eșuat"),
  });

  async function notify(row: AdminLaunchRow) {
    if (
      !window.confirm(
        `Trimiți email către ${row.waitlistCount - row.notifiedCount} persoane neînștiințate de pe lista „${row.name}”?`,
      )
    )
      return;
    setBusyId(row.id);
    try {
      const res = await adminLaunchesApi.notify(row.id);
      toast.success(`${res.emailsSent} emailuri trimise.`);
      qc.invalidateQueries({ queryKey: ["admin", "launches"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Notificarea a eșuat");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">
        Niciun parfum marcat ca lansare. Marchează un produs ca „Lansare curând”.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((row) => (
        <div
          key={row.id}
          className="rounded-lg border border-border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{row.name}</h3>
              <p className="text-sm text-muted-foreground">{row.houseName}</p>
              {row.launchDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Lansare: {new Date(row.launchDate).toLocaleDateString("ro-RO")}
                </p>
              )}
            </div>
            <div className="text-right text-sm">
              <p>
                <span className="font-semibold">{row.waitlistCount}</span> pe listă
                {row.notifiedCount > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({row.notifiedCount} anunțați)
                  </span>
                )}
              </p>
              <p className="text-muted-foreground">
                {row.preOrderCount} precomenzi
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Toggle
              label="Coming soon"
              checked={row.isComingSoon}
              onChange={(v) =>
                flagMutation.mutate({ perfumeId: row.id, body: { isComingSoon: v } })
              }
            />
            <Toggle
              label="Waitlist"
              checked={row.waitlistOpen}
              onChange={(v) =>
                flagMutation.mutate({ perfumeId: row.id, body: { waitlistOpen: v } })
              }
            />
            <Toggle
              label="Pre-order"
              checked={row.preOrderOpen}
              onChange={(v) =>
                flagMutation.mutate({ perfumeId: row.id, body: { preOrderOpen: v } })
              }
            />

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => notify(row)}
                disabled={busyId === row.id || row.waitlistCount === 0}
                className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                {busyId === row.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <BellRing className="size-3.5" />
                )}
                Notifică waitlist
              </button>
            </div>
          </div>
        </div>
      ))}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PackageCheck className="size-3.5" />
        Precomenzile se onorează individual din „Comenzi → Precomenzi” după
        recepția stocului.
      </p>
    </div>
  );
}
