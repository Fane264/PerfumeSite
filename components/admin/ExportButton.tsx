"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

const STATUS_OPTIONS = Object.values(OrderStatus);

/** Header button that exports the orders list as CSV with optional filters. */
export function ExportButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close the popover on an outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function handleExport() {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const query = qs.toString();
    window.location.href = `/api/admin/orders/export${query ? `?${query}` : ""}`;
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted"
      >
        <Download className="size-4" /> Exportă CSV
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 space-y-4 rounded-lg border bg-card p-4 shadow-xl">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Toate</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                De la
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                Până la
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-medium text-background transition-colors hover:bg-gold-light"
          >
            <Download className="size-4" /> Descarcă
          </button>
        </div>
      )}
    </div>
  );
}
