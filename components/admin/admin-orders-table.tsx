"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Check,
  FileText,
  Truck,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatPrice } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_CLASS,
  ORDER_STATUSES,
} from "@/lib/order-status";
import { BulkActions } from "@/components/admin/BulkActions";
import { downloadCsv } from "@/lib/csv";
import type { ApiOrder, OrderStatus } from "@/types";

export function AdminOrdersTable({ initialOrders }: { initialOrders: ApiOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const visible = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  const allVisibleSelected =
    visible.length > 0 && visible.every((o) => selected.includes(o.id));

  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  }

  function toggleSelectAll(checked: boolean) {
    setSelected(checked ? visible.map((o) => o.id) : []);
  }

  async function runBulk(action: string) {
    if (action === "export_csv") {
      const rows = orders.filter((o) => selected.includes(o.id));
      downloadCsv(
        `comenzi-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Comandă", "Client", "Email", "Total", "Monedă", "Status", "Data"],
        rows.map((o) => [
          o.orderNumber,
          o.customer?.name ?? "",
          o.customer?.email ?? "",
          String(o.total),
          o.currency,
          o.status,
          new Date(o.createdAt).toLocaleDateString("ro-RO"),
        ]),
      );
      return;
    }
    if (action === "generate_awb") {
      setBulkBusy(true);
      let ok = 0;
      for (const id of selected) {
        try {
          const updated = await apiFetch<ApiOrder>(`/api/admin/orders/${id}/awb`, {
            method: "POST",
          });
          setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
          ok += 1;
        } catch {
          // Skip orders that can't generate an AWB (e.g. missing address).
        }
      }
      setBulkBusy(false);
      toast.success(`${ok} AWB-uri generate`);
      setSelected([]);
      return;
    }
    // mark_processed
    setBulkBusy(true);
    try {
      await apiFetch("/api/admin/orders/bulk", {
        method: "PATCH",
        body: JSON.stringify({ ids: selected, action }),
      });
      const target = action === "mark_shipped" ? "SHIPPED" : "PROCESSING";
      setOrders((prev) =>
        prev.map((o) =>
          selected.includes(o.id) ? { ...o, status: target as OrderStatus } : o,
        ),
      );
      toast.success("Comenzi actualizate");
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Actualizare eșuată");
    } finally {
      setBulkBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    try {
      const updated = await apiFetch<ApiOrder>(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      toast.success("Comandă actualizată");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Actualizare eșuată");
    } finally {
      setSavingId(null);
    }
  }

  async function generateAwb(id: string) {
    setSavingId(id);
    try {
      const updated = await apiFetch<ApiOrder>(
        `/api/admin/orders/${id}/awb`,
        { method: "POST" },
      );
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      toast.success("AWB generat");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Generarea AWB a eșuat",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", ...ORDER_STATUSES] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors",
              filter === status
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {status === "all" ? "Toate" : ORDER_STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  aria-label="Selectează toate comenzile"
                  className="size-4 accent-gold"
                />
              </th>
              <th className="p-3 font-medium">Comandă</th>
              <th className="p-3 font-medium">Client</th>
              <th className="p-3 font-medium">Data</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nicio comandă.
                </td>
              </tr>
            ) : (
              visible.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  expanded={expanded === order.id}
                  saving={savingId === order.id}
                  selected={selected.includes(order.id)}
                  onSelect={(checked) => toggleSelect(order.id, checked)}
                  onToggle={() =>
                    setExpanded(expanded === order.id ? null : order.id)
                  }
                  onPatch={(body) => patch(order.id, body)}
                  onAwb={() => generateAwb(order.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <BulkActions
        selectedIds={selected}
        busy={bulkBusy}
        actions={[
          { id: "mark_processed", label: "Marchează ca Procesat" },
          { id: "generate_awb", label: "Generează AWB-uri" },
          { id: "export_csv", label: "Export CSV selectate" },
        ]}
        onAction={runBulk}
        onClear={() => setSelected([])}
      />
    </div>
  );
}

function OrderRow({
  order,
  expanded,
  saving,
  selected,
  onSelect,
  onToggle,
  onPatch,
  onAwb,
}: {
  order: ApiOrder;
  expanded: boolean;
  saving: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onToggle: () => void;
  onPatch: (body: Record<string, unknown>) => void;
  onAwb: () => void;
}) {
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const isCod = order.paymentMethod === "COD";
  const canInvoice =
    order.status === "PAID" ||
    order.status === "PAID_COD" ||
    order.status === "DELIVERED";

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="p-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            aria-label={`Selectează comanda ${order.orderNumber}`}
            className="size-4 accent-gold"
          />
        </td>
        <td className="p-3 font-medium">
          <div className="flex items-center gap-2">
            #{order.orderNumber}
            {isCod && (
              <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                Ramburs
              </span>
            )}
          </div>
        </td>
        <td className="p-3">
          <div>{order.customer?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {order.customer?.email}
          </div>
        </td>
        <td className="p-3 text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString("ro-RO")}
        </td>
        <td className="p-3">{formatPrice(order.total, order.currency)}</td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <select
              value={order.status}
              disabled={saving}
              onChange={(e) => onPatch({ status: e.target.value })}
              className={cn(
                "rounded-md border bg-background px-2 py-1 text-xs",
                ORDER_STATUS_CLASS[order.status],
              )}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-background text-foreground">
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            {saving && <Loader2 className="size-4 animate-spin text-gold" />}
          </div>
        </td>
        <td className="p-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Detalii comandă"
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", expanded && "rotate-180")}
            />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/20 last:border-0">
          <td colSpan={7} className="p-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Produse
                </h4>
                <ul className="space-y-1 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between">
                      <span>
                        {item.perfumeName} · {item.sizeML} ml × {item.quantity}
                      </span>
                      <span>{formatPrice(item.lineTotal, order.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Livrare
                </h4>
                <p className="text-sm text-muted-foreground">
                  {order.shippingAddress.name}
                  <br />
                  {order.shippingAddress.line1}
                  {order.shippingAddress.line2
                    ? `, ${order.shippingAddress.line2}`
                    : ""}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.county}{" "}
                  {order.shippingAddress.postalCode}
                  <br />
                  {order.shippingAddress.phone}
                </p>

                <div className="mt-4 flex gap-2">
                  <input
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder="Număr AWB"
                    className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onPatch({ trackingNumber: tracking || null })}
                    className="flex items-center gap-1.5 rounded-md bg-gold px-3 text-sm font-medium text-background hover:bg-gold-light"
                  >
                    <Check className="size-4" /> Salvează
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={onAwb}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-gold disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Truck className="size-3.5" />
                    )}
                    {order.trackingNumber ? "Regenerează AWB" : "Generează AWB"}
                  </button>

                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-gold"
                    >
                      <ExternalLink className="size-3.5" /> Urmărire colet
                    </a>
                  )}

                  {canInvoice && (
                    <a
                      href={`/api/orders/${order.id}/invoice`}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-gold"
                    >
                      <FileText className="size-3.5" /> Factură PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
