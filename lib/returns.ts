import {
  OrderStatus,
  ReturnStatus,
  type Order,
  type OrderItem,
  type ReturnRequest,
  type ReturnItem,
} from "@prisma/client";
import { db } from "./db";
import { toNumber } from "./utils";

// ----------------------------------------------------------------------------
//  Returns domain logic (Phase 8). Customer self-service returns are a legal
//  right in Romania (OG 34/2014 — 14 calendar days from delivery).
// ----------------------------------------------------------------------------

/** Statutory return window, in days from delivery. */
export const RETURN_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReturnIneligibleReason =
  | "already_returned"
  | "outside_window"
  | "not_delivered";

export interface ReturnEligibility {
  eligible: boolean;
  reason?: ReturnIneligibleReason;
  deadlineDate?: Date;
}

/**
 * Whether the given order may still be returned by the given user. Checks that
 * the order is DELIVERED, that delivery happened within the statutory window,
 * and that no return request already exists for it.
 */
export async function canRequestReturn(
  orderId: string,
  userId: string,
): Promise<ReturnEligibility> {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    select: {
      status: true,
      deliveredAt: true,
      createdAt: true,
      returns: { select: { id: true }, take: 1 },
    },
  });

  if (!order || order.status !== OrderStatus.DELIVERED) {
    return { eligible: false, reason: "not_delivered" };
  }

  if (order.returns.length > 0) {
    return { eligible: false, reason: "already_returned" };
  }

  // Window runs from the delivery timestamp; fall back to placement date if a
  // legacy order was marked delivered without stamping `deliveredAt`.
  const from = order.deliveredAt ?? order.createdAt;
  const deadlineDate = new Date(from.getTime() + RETURN_WINDOW_DAYS * DAY_MS);

  if (Date.now() > deadlineDate.getTime()) {
    return { eligible: false, reason: "outside_window", deadlineDate };
  }

  return { eligible: true, deadlineDate };
}

/** Requested return line — a subset (or all) of an order item's quantity. */
export interface RequestedReturnItem {
  orderItemId: string;
  quantity: number;
}

/**
 * Refund value of the requested items, computed from the price snapshot stored
 * on each order item (so it never drifts if the catalog price later changes).
 * Quantities are clamped to what was actually purchased.
 */
export function calculateRefundAmount(
  requested: RequestedReturnItem[],
  orderItems: Pick<OrderItem, "id" | "priceAtPurchase" | "quantity">[],
): number {
  const byId = new Map(orderItems.map((i) => [i.id, i]));
  let total = 0;
  for (const req of requested) {
    const item = byId.get(req.orderItemId);
    if (!item) continue;
    const qty = Math.min(Math.max(1, req.quantity), item.quantity);
    total += toNumber(item.priceAtPurchase) * qty;
  }
  return Math.round(total * 100) / 100;
}

// Backwards-compatible overload matching the spec signature: given persisted
// ReturnItem rows + the parent order (with items), resolve the refund value.
export function calculateRefundFromReturnItems(
  returnItems: Pick<ReturnItem, "orderItemId" | "quantity">[],
  order: Order & { items: OrderItem[] },
): number {
  return calculateRefundAmount(
    returnItems.map((r) => ({ orderItemId: r.orderItemId, quantity: r.quantity })),
    order.items,
  );
}

/** Short human-friendly return reference, e.g. `RET-7F3A21`. */
export function generateReturnNumber(id: string): string {
  return `RET-${id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`;
}

// ----------------------------------------------------------------------------
//  Serialization for API responses (Decimal → number, Date → ISO string).
// ----------------------------------------------------------------------------

export interface ApiReturnItem {
  id: string;
  orderItemId: string;
  quantity: number;
  reason: string | null;
  perfumeName: string;
  houseName: string;
  sizeML: number;
  unitPrice: number;
}

export interface ApiReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  status: ReturnStatus;
  reason: string;
  description: string | null;
  refundAmount: number | null;
  refundMethod: string | null;
  adminNotes: string | null;
  trackingNumber: string | null;
  items: ApiReturnItem[];
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

type ReturnWithRelations = ReturnRequest & {
  order: { orderNumber: string };
  user?: { firstName: string | null; lastName: string | null; email: string } | null;
  items: (ReturnItem & {
    orderItem: Pick<
      OrderItem,
      "priceAtPurchase" | "sizeMLAtPurchase" | "perfumeNameAtPurchase" | "houseNameAtPurchase"
    >;
  })[];
};

/** Serialize a return request (with order, user and items) for API output. */
export function serializeReturn(r: ReturnWithRelations): ApiReturnRequest {
  return {
    id: r.id,
    returnNumber: generateReturnNumber(r.id),
    orderId: r.orderId,
    orderNumber: r.order.orderNumber,
    userId: r.userId,
    status: r.status,
    reason: r.reason,
    description: r.description,
    refundAmount: r.refundAmount !== null ? toNumber(r.refundAmount) : null,
    refundMethod: r.refundMethod,
    adminNotes: r.adminNotes,
    trackingNumber: r.trackingNumber,
    items: r.items.map((item) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      reason: item.reason,
      perfumeName: item.orderItem.perfumeNameAtPurchase,
      houseName: item.orderItem.houseNameAtPurchase,
      sizeML: toNumber(item.orderItem.sizeMLAtPurchase),
      unitPrice: toNumber(item.orderItem.priceAtPurchase),
    })),
    customerName: r.user
      ? [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || null
      : null,
    customerEmail: r.user?.email ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
  };
}

/** Prisma include used everywhere a return is serialized. */
export const returnInclude = {
  order: { select: { orderNumber: true } },
  user: { select: { firstName: true, lastName: true, email: true } },
  items: {
    include: {
      orderItem: {
        select: {
          priceAtPurchase: true,
          sizeMLAtPurchase: true,
          perfumeNameAtPurchase: true,
          houseNameAtPurchase: true,
        },
      },
    },
  },
} as const;
