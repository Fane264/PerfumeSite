import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "În așteptare",
  PENDING_COD: "Ramburs — neconfirmată",
  PAID: "Plătită",
  PAID_COD: "Ramburs — încasată",
  PROCESSING: "În procesare",
  SHIPPED: "Expediată",
  DELIVERED: "Livrată",
  CANCELLED: "Anulată",
  REFUNDED: "Rambursată",
};

/** Tailwind classes for an order-status pill, keyed by status. */
export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PENDING_COD: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  PAID: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PAID_COD: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PROCESSING: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  SHIPPED: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  DELIVERED: "bg-success/15 text-success border-success/30",
  CANCELLED: "bg-error/15 text-red-300 border-error/40",
  REFUNDED: "bg-error/15 text-red-300 border-error/40",
};

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PENDING_COD",
  "PAID",
  "PAID_COD",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];
