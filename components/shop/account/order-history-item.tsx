"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileText } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from "@/lib/order-status";
import { OrderTimeline } from "@/components/shop/OrderTimeline";
import type { ApiOrder } from "@/types";

/** A single order card with an expandable detail panel showing the timeline. */
export function OrderHistoryItem({ order }: { order: ApiOrder }) {
  const [open, setOpen] = useState(false);
  const canInvoice =
    order.status === "PAID" ||
    order.status === "PAID_COD" ||
    order.status === "DELIVERED";

  return (
    <article className="border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="font-serif text-lg text-cream">#{order.orderNumber}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("ro-RO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={cn(
            "rounded-sm border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
            ORDER_STATUS_CLASS[order.status],
          )}
        >
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between text-muted-foreground"
          >
            <span>
              <span className="text-cream">{item.perfumeName}</span> ·{" "}
              {item.sizeML} ml × {item.quantity}
            </span>
            <span className="text-cream">
              {formatPrice(item.lineTotal, order.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-gold"
          aria-expanded={open}
        >
          Detalii comandă
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        <span className="font-serif text-lg text-gold">
          {formatPrice(order.total, order.currency)}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-6 grid gap-8 border-t border-border pt-6 md:grid-cols-2">
              <div>
                <p className="mb-4 text-xs uppercase tracking-luxe text-gold">
                  Status comandă
                </p>
                <OrderTimeline order={order} />
              </div>
              <div>
                <p className="mb-4 text-xs uppercase tracking-luxe text-gold">
                  Detalii
                </p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="text-cream">
                      {formatPrice(order.subtotal, order.currency)}
                    </dd>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Reducere</dt>
                      <dd className="text-cream">
                        − {formatPrice(order.discount, order.currency)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Transport</dt>
                    <dd className="text-cream">
                      {order.shippingCost > 0
                        ? formatPrice(order.shippingCost, order.currency)
                        : "Gratuit"}
                    </dd>
                  </div>
                  {order.paymentMethod === "COD" && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Plată</dt>
                      <dd className="text-amber-400">Ramburs la livrare</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <dt className="text-cream">Total</dt>
                    <dd className="text-gold">
                      {formatPrice(order.total, order.currency)}
                    </dd>
                  </div>
                </dl>

                {canInvoice && (
                  <a
                    href={`/api/orders/${order.id}/invoice`}
                    className="mt-5 inline-flex items-center gap-2 border border-gold px-4 py-2 text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
                  >
                    <FileText className="size-3.5" /> Descarcă Factură
                  </a>
                )}

                <p className="mt-6 mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Livrare către
                </p>
                <address className="text-sm not-italic text-cream">
                  {order.shippingAddress.name}
                  <br />
                  {order.shippingAddress.line1}
                  {order.shippingAddress.line2
                    ? `, ${order.shippingAddress.line2}`
                    : ""}
                  <br />
                  {order.shippingAddress.postalCode} {order.shippingAddress.city},{" "}
                  {order.shippingAddress.county}
                </address>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
