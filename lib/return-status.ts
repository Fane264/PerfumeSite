import type { ReturnReason, ReturnStatus } from "@prisma/client";

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  PENDING: "În așteptare",
  APPROVED: "Aprobat",
  AWAITING_PARCEL: "Așteptăm coletul",
  RECEIVED: "Colet primit",
  REFUNDED: "Rambursat",
  REJECTED: "Respins",
};

/** Tailwind classes for a return-status pill, keyed by status. */
export const RETURN_STATUS_CLASS: Record<ReturnStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  APPROVED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  AWAITING_PARCEL: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  RECEIVED: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  REFUNDED: "bg-success/15 text-success border-success/30",
  REJECTED: "bg-error/15 text-red-300 border-error/40",
};

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  CHANGED_MIND: "M-am răzgândit",
  WRONG_ITEM: "Produs greșit",
  DAMAGED: "Produs deteriorat",
  NOT_AS_DESCRIBED: "Diferit de descriere",
  QUALITY_ISSUE: "Problemă de calitate",
  OTHER: "Alt motiv",
};

export const RETURN_REASONS: ReturnReason[] = [
  "CHANGED_MIND",
  "WRONG_ITEM",
  "DAMAGED",
  "NOT_AS_DESCRIBED",
  "QUALITY_ISSUE",
  "OTHER",
];

/** Ordered lifecycle for the customer-facing return timeline. */
export const RETURN_TIMELINE: ReturnStatus[] = [
  "PENDING",
  "APPROVED",
  "AWAITING_PARCEL",
  "RECEIVED",
  "REFUNDED",
];
