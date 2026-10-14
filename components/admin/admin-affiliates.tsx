"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminAffiliatesApi, ApiError } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import type { AdminAffiliateRow } from "@/lib/affiliate";

type Tab = "PENDING" | "ACTIVE" | "SUSPENDED";

const TABS: { id: Tab; label: string }[] = [
  { id: "PENDING", label: "Aplicații în așteptare" },
  { id: "ACTIVE", label: "Activi" },
  { id: "SUSPENDED", label: "Suspendați" },
];

export function AdminAffiliates({
  initial,
}: {
  initial: AdminAffiliateRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<Tab>("PENDING");
  const [savingId, setSavingId] = useState<string | null>(null);

  const visible = useMemo(
    () => rows.filter((r) => r.status === tab),
    [rows, tab],
  );

  function replace(updated: AdminAffiliateRow) {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function update(id: string, body: { status?: string; commissionRate?: number }) {
    setSavingId(id);
    try {
      replace(await adminAffiliatesApi.update(id, body));
      toast.success("Afiliat actualizat");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Eroare");
    } finally {
      setSavingId(null);
    }
  }

  async function payout(row: AdminAffiliateRow) {
    const ref = window.prompt(
      `Plătești ${row.availableForPayout.toFixed(2)} RON către ${row.customerName}. Referință PayPal (opțional):`,
      "",
    );
    if (ref === null) return;
    setSavingId(row.id);
    try {
      replace(
        await adminAffiliatesApi.payout(row.id, {
          amount: row.availableForPayout,
          reference: ref || undefined,
        }),
      );
      toast.success("Plată înregistrată");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Eroare");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
              tab === t.id
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({rows.filter((r) => r.status === t.id).length})
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3 font-medium">Afiliat</th>
              <th className="p-3 font-medium">Cod</th>
              <th className="p-3 font-medium">Rată</th>
              <th className="p-3 font-medium">Conversii</th>
              <th className="p-3 font-medium">Câștigat</th>
              <th className="p-3 font-medium">Disponibil</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Niciun afiliat în această categorie.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  saving={savingId === row.id}
                  onUpdate={update}
                  onPayout={() => payout(row)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  row,
  saving,
  onUpdate,
  onPayout,
}: {
  row: AdminAffiliateRow;
  saving: boolean;
  onUpdate: (id: string, body: { status?: string; commissionRate?: number }) => void;
  onPayout: () => void;
}) {
  const [rate, setRate] = useState(String(Math.round(row.commissionRate * 100)));

  return (
    <tr className="border-b last:border-0 align-top">
      <td className="p-3">
        <div className="font-medium">{row.customerName}</div>
        <div className="text-xs text-muted-foreground">{row.customerEmail}</div>
        {(row.instagramHandle || row.tiktokHandle) && (
          <div className="mt-1 text-xs text-muted-foreground">
            {row.instagramHandle ? `IG @${row.instagramHandle}` : ""}
            {row.instagramHandle && row.tiktokHandle ? " · " : ""}
            {row.tiktokHandle ? `TT @${row.tiktokHandle}` : ""}
          </div>
        )}
      </td>
      <td className="p-3 font-mono text-xs">{row.code}</td>
      <td className="p-3">
        <div className="flex items-center gap-1">
          <input
            value={rate}
            onChange={(e) => setRate(e.target.value.replace(/[^0-9]/g, ""))}
            className="h-8 w-14 rounded-md border border-input bg-background px-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </td>
      <td className="p-3">{row.conversionCount}</td>
      <td className="p-3">{formatPrice(row.totalEarned, "RON")}</td>
      <td className="p-3 text-gold">
        {formatPrice(row.availableForPayout, "RON")}
      </td>
      <td className="p-3">
        <div className="flex flex-wrap justify-end gap-2">
          {saving && <Loader2 className="size-4 animate-spin text-gold" />}
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onUpdate(row.id, {
                commissionRate: Math.max(0, Math.min(100, Number(rate))) / 100,
              })
            }
            className="rounded-md border border-border px-2.5 py-1 text-xs hover:border-gold disabled:opacity-50"
          >
            Salvează rată
          </button>
          {row.status !== "ACTIVE" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onUpdate(row.id, { status: "ACTIVE" })}
              className="rounded-md bg-gold px-2.5 py-1 text-xs font-medium text-background hover:bg-gold-light disabled:opacity-50"
            >
              Aprobă
            </button>
          )}
          {row.status === "ACTIVE" && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => onUpdate(row.id, { status: "SUSPENDED" })}
                className="rounded-md border border-error/40 px-2.5 py-1 text-xs text-red-300 hover:bg-error/10 disabled:opacity-50"
              >
                Suspendă
              </button>
              <button
                type="button"
                disabled={saving || row.availableForPayout <= 0}
                onClick={onPayout}
                className="rounded-md border border-success/40 px-2.5 py-1 text-xs text-success hover:bg-success/10 disabled:opacity-40"
              >
                Plătește
              </button>
            </>
          )}
          {row.status === "SUSPENDED" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onUpdate(row.id, { status: "ACTIVE" })}
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:border-gold disabled:opacity-50"
            >
              Reactivează
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
