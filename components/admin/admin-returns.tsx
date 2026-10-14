"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, X } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { adminReturnsApi } from "@/lib/api-client";
import type { ApiReturnRequest } from "@/lib/returns";
import {
  RETURN_STATUS_LABEL,
  RETURN_STATUS_CLASS,
  RETURN_REASON_LABEL,
} from "@/lib/return-status";
import { Button } from "@/components/ui/button";

type Filter =
  | "all"
  | "PENDING"
  | "APPROVED"
  | "RECEIVED"
  | "REFUNDED"
  | "REJECTED";

const TABS: { id: Filter; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "PENDING", label: "În așteptare" },
  { id: "APPROVED", label: "Aprobate" },
  { id: "RECEIVED", label: "Primite" },
  { id: "REFUNDED", label: "Rambursate" },
  { id: "REJECTED", label: "Respinse" },
];

export function AdminReturns({
  initialReturns,
}: {
  initialReturns: ApiReturnRequest[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<ApiReturnRequest | null>(null);

  const { data: returns } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: () => adminReturnsApi.list(),
    initialData: initialReturns,
  });

  const rows = useMemo(
    () =>
      filter === "all"
        ? returns
        : returns.filter((r) => r.status === filter),
    [returns, filter],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Retur</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Comandă</th>
              <th className="px-4 py-3">Produse</th>
              <th className="px-4 py-3">Valoare</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Dată</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Nicio cerere de retur.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-accent/40"
                >
                  <td className="px-4 py-3 font-medium">#{r.returnNumber}</td>
                  <td className="px-4 py-3">
                    {r.customerName ?? "—"}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {r.customerEmail}
                    </span>
                  </td>
                  <td className="px-4 py-3">#{r.orderNumber}</td>
                  <td className="px-4 py-3">{r.items.length}</td>
                  <td className="px-4 py-3">
                    {r.refundAmount !== null
                      ? formatPrice(r.refundAmount, "RON")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase",
                        RETURN_STATUS_CLASS[r.status],
                      )}
                    >
                      {RETURN_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("ro-RO")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ReturnDetailModal
          returnRequest={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ReturnDetailModal({
  returnRequest,
  onClose,
}: {
  returnRequest: ApiReturnRequest;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [refundAmount, setRefundAmount] = useState<string>(
    returnRequest.refundAmount !== null
      ? String(returnRequest.refundAmount)
      : "",
  );
  const [refundMethod, setRefundMethod] = useState<"card" | "voucher">(
    (returnRequest.refundMethod as "card" | "voucher") ?? "card",
  );
  const [adminNotes, setAdminNotes] = useState(returnRequest.adminNotes ?? "");
  const [trackingNumber, setTrackingNumber] = useState(
    returnRequest.trackingNumber ?? "",
  );

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof adminReturnsApi.update>[1]) =>
      adminReturnsApi.update(returnRequest.id, body),
    onSuccess: () => {
      toast.success("Retur actualizat");
      void queryClient.invalidateQueries({ queryKey: ["admin-returns"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function update(status?: string) {
    mutation.mutate({
      status,
      adminNotes: adminNotes.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      refundAmount: refundAmount ? Number(refundAmount) : undefined,
      refundMethod,
    });
  }

  const isResolved =
    returnRequest.status === "REFUNDED" || returnRequest.status === "REJECTED";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Retur ${returnRequest.returnNumber}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-2xl">#{returnRequest.returnNumber}</h3>
            <p className="text-sm text-muted-foreground">
              Comanda #{returnRequest.orderNumber} ·{" "}
              {returnRequest.customerName} ({returnRequest.customerEmail})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-1 text-xs uppercase text-muted-foreground">Motiv</p>
            <p className="text-sm">
              {RETURN_REASON_LABEL[
                returnRequest.reason as keyof typeof RETURN_REASON_LABEL
              ] ?? returnRequest.reason}
            </p>
            {returnRequest.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {returnRequest.description}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs uppercase text-muted-foreground">
              Produse selectate
            </p>
            <ul className="space-y-1 rounded-md border border-border p-3 text-sm">
              {returnRequest.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.perfumeName} · {item.sizeML} ml × {item.quantity}
                  </span>
                  <span>{formatPrice(item.unitPrice * item.quantity, "RON")}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="refund-amount"
                className="mb-1 block text-xs uppercase text-muted-foreground"
              >
                Sumă rambursare
              </label>
              <input
                id="refund-amount"
                type="number"
                min={0}
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="refund-method"
                className="mb-1 block text-xs uppercase text-muted-foreground"
              >
                Metodă ramburs
              </label>
              <select
                id="refund-method"
                value={refundMethod}
                onChange={(e) =>
                  setRefundMethod(e.target.value as "card" | "voucher")
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="card">Card (Stripe)</option>
                <option value="voucher">Voucher</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="tracking-number"
              className="mb-1 block text-xs uppercase text-muted-foreground"
            >
              AWB retur (de la client)
            </label>
            <input
              id="tracking-number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="admin-notes"
              className="mb-1 block text-xs uppercase text-muted-foreground"
            >
              Note interne / motiv respingere
            </label>
            <textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {mutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Se procesează…
            </div>
          )}

          {!isResolved && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {returnRequest.status === "PENDING" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => update("APPROVED")}
                    disabled={mutation.isPending}
                  >
                    Aprobă
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => update("REJECTED")}
                    disabled={mutation.isPending}
                  >
                    Respinge
                  </Button>
                </>
              )}
              {(returnRequest.status === "APPROVED" ||
                returnRequest.status === "AWAITING_PARCEL") && (
                <Button
                  size="sm"
                  onClick={() => update("RECEIVED")}
                  disabled={mutation.isPending}
                >
                  Marchează primit
                </Button>
              )}
              {returnRequest.status === "RECEIVED" && (
                <Button
                  size="sm"
                  variant="gold"
                  onClick={() => update("REFUNDED")}
                  disabled={mutation.isPending}
                >
                  Rambursează
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => update(undefined)}
                disabled={mutation.isPending}
              >
                Salvează modificările
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
