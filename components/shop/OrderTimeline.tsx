"use client";

import { motion } from "framer-motion";
import { Check, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiOrder } from "@/types";

interface OrderTimelineProps {
  order: ApiOrder;
}

interface TimelineStep {
  label: string;
  date: string | null;
  done: boolean;
  tracking?: boolean;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

/** Visual progress timeline for a single order. */
export function OrderTimeline({ order }: OrderTimelineProps) {
  const isCod = order.paymentMethod === "COD";
  const isPaidCod = order.status === "PAID_COD";
  const paidDone =
    Boolean(order.paidAt) ||
    isPaidCod ||
    ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status);
  const processingDone =
    isPaidCod || ["PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status);
  const shippedDone =
    Boolean(order.shippedAt) ||
    isPaidCod ||
    ["SHIPPED", "DELIVERED"].includes(order.status);
  const deliveredDone =
    Boolean(order.deliveredAt) || isPaidCod || order.status === "DELIVERED";

  const steps: TimelineStep[] = [
    { label: "Comandă plasată", date: formatDate(order.createdAt), done: true },
    {
      label: isCod ? "Comandă confirmată" : "Plată confirmată",
      date: formatDate(order.paidAt),
      done: isCod ? processingDone || paidDone : paidDone,
    },
    { label: "Comandă procesată", date: null, done: processingDone },
    {
      label: "Expediată",
      date: formatDate(order.shippedAt),
      done: shippedDone,
      tracking: true,
    },
    { label: "Livrată", date: formatDate(order.deliveredAt), done: deliveredDone },
  ];

  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <motion.ol
      variants={container}
      initial="hidden"
      animate="show"
      className="relative space-y-6 pl-2"
    >
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;
        return (
          <motion.li
            key={step.label}
            variants={item}
            className="relative flex gap-4"
          >
            {/* Connector line */}
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[11px] top-7 h-[calc(100%+0.5rem)] w-px",
                  step.done ? "bg-gold/50" : "bg-border",
                )}
                aria-hidden
              />
            )}

            {/* Indicator */}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                step.done
                  ? "border-gold bg-gold text-background"
                  : isCurrent
                    ? "border-gold text-gold"
                    : "border-border text-muted-foreground",
                isCurrent && !step.done && "animate-pulse",
              )}
            >
              {step.done ? (
                <Check className="size-3.5" />
              ) : step.tracking ? (
                <Truck className="size-3" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>

            <div className="flex-1">
              <p
                className={cn(
                  "text-sm",
                  step.done || isCurrent ? "text-cream" : "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-muted-foreground">{step.date}</p>
              )}
              {step.tracking && order.trackingNumber && (
                <p className="mt-1 text-xs">
                  <span className="text-muted-foreground">Curier · AWB </span>
                  {order.trackingUrl ? (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    >
                      {order.trackingNumber}
                    </a>
                  ) : (
                    <span className="text-cream">{order.trackingNumber}</span>
                  )}
                </p>
              )}
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
