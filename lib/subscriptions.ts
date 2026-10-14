import type {
  Subscription,
  SubscriptionBox,
  SubscriptionPlan,
} from "@prisma/client";
import { toNumber } from "./utils";

export interface ApiSubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  decantCount: number;
  sizeML: number;
  features: string[];
  isFeatured: boolean;
}

export interface ApiSubscriptionBox {
  id: string;
  month: string;
  status: string;
  trackingNumber: string | null;
  contents: unknown;
  shippedAt: string | null;
  createdAt: string;
}

export interface ApiSubscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  preferences: unknown;
  plan: ApiSubscriptionPlan;
  boxes: ApiSubscriptionBox[];
}

export function serializeSubscriptionPlan(
  plan: SubscriptionPlan,
): ApiSubscriptionPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: toNumber(plan.price),
    currency: plan.currency,
    decantCount: plan.decantCount,
    sizeML: toNumber(plan.sizeML),
    features: plan.features,
    isFeatured: plan.isFeatured,
  };
}

export function serializeSubscriptionBox(
  box: SubscriptionBox,
): ApiSubscriptionBox {
  return {
    id: box.id,
    month: box.month,
    status: box.status,
    trackingNumber: box.trackingNumber,
    contents: box.contents,
    shippedAt: box.shippedAt ? box.shippedAt.toISOString() : null,
    createdAt: box.createdAt.toISOString(),
  };
}

export function serializeSubscription(
  subscription: Subscription & {
    plan: SubscriptionPlan;
    boxes: SubscriptionBox[];
  },
): ApiSubscription {
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    preferences: subscription.preferences,
    plan: serializeSubscriptionPlan(subscription.plan),
    boxes: subscription.boxes
      .slice()
      .sort((a, b) => b.month.localeCompare(a.month))
      .map(serializeSubscriptionBox),
  };
}
