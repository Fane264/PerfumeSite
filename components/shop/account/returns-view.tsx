"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, RotateCcw, ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import {
  ordersApi,
  returnsApi,
  type CreateReturnPayload,
} from "@/lib/api-client";
import {
  RETURN_STATUS_LABEL,
  RETURN_STATUS_CLASS,
  RETURN_REASON_LABEL,
  RETURN_REASONS,
  RETURN_TIMELINE,
} from "@/lib/return-status";
import type { ApiOrder, ApiOrderItem } from "@/types";
import { Button } from "@/components/ui/button";

const RETURN_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function isWithinWindow(order: ApiOrder): boolean {
  const ref = order.deliveredAt ?? order.createdAt;
  return Date.now() - new Date(ref).getTime() <= RETURN_WINDOW_DAYS * DAY_MS;
}

export function ReturnsView() {
  const queryClient = useQueryClient();
  const [activeOrder, setActiveOrder] = useState<ApiOrder | null>(null);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: ordersApi.list,
  });
  const { data: returns, isLoading: returnsLoading } = useQuery({
    queryKey: ["returns"],
    queryFn: returnsApi.list,
  });

  const returnedOrderIds = useMemo(
    () => new Set((returns ?? []).map((r) => r.orderId)),
    [returns],
  );

  const eligibleOrders = useMemo(
    () =>
      (orders ?? []).filter(
        (o) =>
          o.status === "DELIVERED" &&
          !returnedOrderIds.has(o.id) &&
          isWithinWindow(o),
      ),
    [orders, returnedOrderIds],
  );

  const isLoading = ordersLoading || returnsLoading;

  return (
    <div className="container py-28 md:py-32">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-luxe text-gold">Contul meu</p>
          <h1 className="mt-2 font-serif text-4xl font-light text-cream md:text-5xl">
            Retururile mele
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Ai la dispoziție {RETURN_WINDOW_DAYS} zile de la livrare pentru a
            returna produsele (OG 34/2014).
          </p>
        </div>
        <Link
          href="/cont"
          className="text-sm text-muted-foreground transition-colors hover:text-gold"
        >
          ← Înapoi la cont
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gold" />
        </div>
      ) : (
        <div className="space-y-12">
          {/* Eligible orders */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-light text-cream">
              Comenzi eligibile pentru retur
            </h2>
            {eligibleOrders.length === 0 ? (
              <p className="border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                Nicio comandă eligibilă pentru retur momentan.
              </p>
            ) : (
              <div className="space-y-3">
                {eligibleOrders.map((order) => (
                  <article
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface p-5"
                  >
                    <div>
                      <p className="font-serif text-lg text-cream">
                        #{order.orderNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length}{" "}
                        {order.items.length === 1 ? "produs" : "produse"} ·{" "}
                        {formatPrice(order.total, order.currency)}
                      </p>
                    </div>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => setActiveOrder(order)}
                    >
                      <RotateCcw className="size-4" /> Inițiază retur
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Submitted return requests */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-light text-cream">
              Cereri trimise
            </h2>
            {!returns || returns.length === 0 ? (
              <p className="border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                Nu ai trimis nicio cerere de retur.
              </p>
            ) : (
              <div className="space-y-4">
                {returns.map((r) => (
                  <article key={r.id} className="border border-border bg-surface p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-serif text-lg text-cream">
                          #{r.returnNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Comanda #{r.orderNumber} ·{" "}
                          {new Date(r.createdAt).toLocaleDateString("ro-RO", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-sm border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                          RETURN_STATUS_CLASS[r.status],
                        )}
                      >
                        {RETURN_STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                      {r.items.map((item) => (
                        <li key={item.id}>
                          {item.perfumeName} · {item.sizeML} ml × {item.quantity}
                        </li>
                      ))}
                    </ul>
                    {r.status !== "REJECTED" && (
                      <ReturnTimeline current={r.status} />
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                      <span className="text-muted-foreground">
                        {RETURN_REASON_LABEL[
                          r.reason as keyof typeof RETURN_REASON_LABEL
                        ] ?? r.reason}
                      </span>
                      {r.refundAmount !== null && (
                        <span className="font-serif text-base text-gold">
                          {formatPrice(r.refundAmount, "RON")}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeOrder && (
        <ReturnFormModal
          order={activeOrder}
          onClose={() => setActiveOrder(null)}
          onSuccess={() => {
            setActiveOrder(null);
            void queryClient.invalidateQueries({ queryKey: ["returns"] });
          }}
        />
      )}
    </div>
  );
}

function ReturnTimeline({ current }: { current: string }) {
  const currentIndex = RETURN_TIMELINE.indexOf(
    current as (typeof RETURN_TIMELINE)[number],
  );
  return (
    <ol className="mt-4 flex items-center gap-1" aria-label="Status retur">
      {RETURN_TIMELINE.map((step, i) => {
        const done = currentIndex >= 0 && i <= currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center gap-1">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px]",
                done
                  ? "border-gold bg-gold/20 text-gold"
                  : "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            {i < RETURN_TIMELINE.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  done ? "bg-gold/40" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface SelectedItem {
  orderItemId: string;
  quantity: number;
}

function ReturnFormModal({
  order,
  onClose,
  onSuccess,
}: {
  order: ApiOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<string>("CHANGED_MIND");
  const [description, setDescription] = useState("");

  const selectedItems: SelectedItem[] = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, qty]) => qty > 0)
        .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
    [selected],
  );

  const estimatedRefund = useMemo(() => {
    let total = 0;
    for (const { orderItemId, quantity } of selectedItems) {
      const item = order.items.find((i) => i.id === orderItemId);
      if (item) total += item.unitPrice * quantity;
    }
    return Math.round(total * 100) / 100;
  }, [selectedItems, order.items]);

  const mutation = useMutation({
    mutationFn: (payload: CreateReturnPayload) => returnsApi.create(payload),
    onSuccess: () => {
      toast.success("Cererea de retur a fost trimisă");
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggleItem(item: ApiOrderItem, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[item.id] = next[item.id] || 1;
      else delete next[item.id];
      return next;
    });
  }

  function setQuantity(item: ApiOrderItem, quantity: number) {
    setSelected((prev) => ({
      ...prev,
      [item.id]: Math.min(Math.max(1, quantity), item.quantity),
    }));
  }

  function submit() {
    mutation.mutate({
      orderId: order.id,
      reason,
      description: description.trim() || undefined,
      items: selectedItems,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Retur comanda ${order.orderNumber}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-border bg-surface p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-luxe text-gold">
              Retur · Pasul {step} din 3
            </p>
            <h3 className="mt-1 font-serif text-2xl font-light text-cream">
              Comanda #{order.orderNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="text-muted-foreground transition-colors hover:text-cream"
          >
            <X className="size-5" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selectează produsele pe care vrei să le returnezi.
            </p>
            {order.items.map((item) => {
              const checked = (selected[item.id] ?? 0) > 0;
              return (
                <label
                  key={item.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border p-3 transition-colors",
                    checked ? "border-gold/50 bg-gold/5" : "border-border",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleItem(item, e.target.checked)}
                    className="size-4 accent-gold"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-cream">{item.perfumeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.houseName} · {item.sizeML} ml ·{" "}
                      {formatPrice(item.unitPrice, order.currency)}
                    </p>
                  </div>
                  {checked && item.quantity > 1 && (
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={selected[item.id] ?? 1}
                      onChange={(e) =>
                        setQuantity(item, Number(e.target.value))
                      }
                      aria-label={`Cantitate ${item.perfumeName}`}
                      className="w-16 border border-border bg-background px-2 py-1 text-sm text-cream"
                    />
                  )}
                </label>
              );
            })}
            <div className="flex justify-end pt-2">
              <Button
                variant="gold"
                disabled={selectedItems.length === 0}
                onClick={() => setStep(2)}
              >
                Continuă <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="return-reason"
                className="mb-1 block text-sm text-cream"
              >
                Motivul returului
              </label>
              <select
                id="return-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-border bg-background px-3 py-2 text-sm text-cream"
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {RETURN_REASON_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="return-description"
                className="mb-1 block text-sm text-cream"
              >
                Detalii (opțional)
              </label>
              <textarea
                id="return-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Spune-ne mai multe despre motivul returului…"
                className="w-full border border-border bg-background px-3 py-2 text-sm text-cream"
              />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" /> Înapoi
              </Button>
              <Button variant="gold" onClick={() => setStep(3)}>
                Continuă <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verifică detaliile cererii de retur.
            </p>
            <ul className="space-y-1 border border-border bg-background p-4 text-sm">
              {selectedItems.map(({ orderItemId, quantity }) => {
                const item = order.items.find((i) => i.id === orderItemId);
                if (!item) return null;
                return (
                  <li
                    key={orderItemId}
                    className="flex justify-between text-cream"
                  >
                    <span>
                      {item.perfumeName} × {quantity}
                    </span>
                    <span>
                      {formatPrice(item.unitPrice * quantity, order.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">
                Sumă estimată de rambursat
              </span>
              <span className="font-serif text-xl text-gold">
                {formatPrice(estimatedRefund, order.currency)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Suma finală va fi confirmată după verificarea produselor.
            </p>
            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                disabled={mutation.isPending}
              >
                <ArrowLeft className="size-4" /> Înapoi
              </Button>
              <Button
                variant="gold"
                onClick={submit}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Trimite cererea
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
