import type {
  AdminAnalytics,
  AnalyticsPeriod,
  ApiCart,
  ApiOrder,
  ApiPerfumeListItem,
  ApiReview,
  RatingSummary,
} from "@/types";
import type {
  AffiliateDashboardData,
  AdminAffiliateRow,
} from "@/lib/affiliate";
import type { ApiCampaign } from "@/lib/campaigns";
import type { ApiReturnRequest } from "@/lib/returns";

/** Shape of the server envelope returned by every API route. */
export interface ApiEnvelope<T> {
  data: T | null;
  error: string | null;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    rating?: RatingSummary;
    [key: string]: unknown;
  };
}

/** Thrown when an API route responds with a non-null `error`. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch a JSON API route and unwrap the `{ data, error }` envelope. Throws
 * `ApiError` on transport or application errors so callers (react-query) can
 * surface a message.
 */
export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // Non-JSON response (e.g. a 500 HTML page).
  }

  if (!res.ok || !body || body.error) {
    throw new ApiError(
      body?.error ?? `Eroare de rețea (${res.status})`,
      res.status,
    );
  }
  return body.data as T;
}

/** Like `apiFetch` but returns the full envelope (for paginated lists). */
export async function apiFetchEnvelope<T>(
  input: string,
  init?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const res = await fetch(input, init);
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || body.error) {
    throw new ApiError(body.error ?? `Eroare de rețea (${res.status})`, res.status);
  }
  return body;
}

// ---------------------------------------------------------------------------
//  Typed endpoint helpers
// ---------------------------------------------------------------------------

export function buildPerfumeQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export const cartApi = {
  get: () => apiFetch<ApiCart>("/api/cart"),
  add: (variantId: string, quantity = 1) =>
    apiFetch<ApiCart>("/api/cart", {
      method: "POST",
      body: JSON.stringify({ variantId, quantity }),
    }),
  addBundle: (bundleId: string) =>
    apiFetch<ApiCart>("/api/cart", {
      method: "POST",
      body: JSON.stringify({ bundleId }),
    }),
  setQuantity: (cartItemId: string, quantity: number) =>
    apiFetch<ApiCart>("/api/cart", {
      method: "PATCH",
      body: JSON.stringify({ cartItemId, quantity }),
    }),
  remove: (cartItemId: string) =>
    apiFetch<ApiCart>("/api/cart", {
      method: "DELETE",
      body: JSON.stringify({ cartItemId }),
    }),
};

// ---------------------------------------------------------------------------
//  Bundles / discovery sets (Phase 6)
// ---------------------------------------------------------------------------

export interface BundleItemDto {
  variantId: string;
  perfumeName: string;
  perfumeSlug: string;
  houseName: string;
  sizeML: number;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
}

export interface BundleDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  isFeatured: boolean;
  items: BundleItemDto[];
  individualTotal: number;
  savings: number;
}

export const bundlesApi = {
  list: () => apiFetch<BundleDto[]>("/api/bundles"),
  bySlug: (slug: string) => apiFetch<BundleDto>(`/api/bundles/${slug}`),
};

// ---------------------------------------------------------------------------
//  Personal recommendations (Phase 6)
// ---------------------------------------------------------------------------

export interface PersonalRecommendations {
  hasEnoughData: boolean;
  basedOnPurchases: ApiPerfumeListItem[];
  topInYourFamilies: ApiPerfumeListItem[];
  housesYouLike: ApiPerfumeListItem[];
  newArrivals: ApiPerfumeListItem[];
}

export const recommendationsApi = {
  personal: () =>
    apiFetch<PersonalRecommendations>("/api/recommendations/personal"),
};

// ---------------------------------------------------------------------------
//  Admin inventory forecasting (Phase 6)
// ---------------------------------------------------------------------------

export type ForecastStatus = "critical" | "reorder_soon" | "ok" | "overstocked";

export interface ForecastItem {
  variantId: string;
  sku: string;
  perfumeName: string;
  houseName: string;
  sizeML: number;
  currentStock: number;
  avgUnitsPerDay: number;
  daysUntilStockout: number | null;
  recommendedReorder: number;
  status: ForecastStatus;
}

export interface InventoryForecast {
  items: ForecastItem[];
  summary: Record<ForecastStatus, number>;
}

export const adminInventoryApi = {
  forecast: () => apiFetch<InventoryForecast>("/api/admin/inventory/forecast"),
};

export interface WishlistEntry {
  id: string;
  addedAt: string;
  perfume: ApiPerfumeListItem;
}

export const wishlistApi = {
  list: () => apiFetch<WishlistEntry[]>("/api/wishlist"),
  add: (perfumeId: string) =>
    apiFetch<{ perfumeId: string; wishlisted: boolean }>("/api/wishlist", {
      method: "POST",
      body: JSON.stringify({ perfumeId }),
    }),
  remove: (perfumeId: string) =>
    apiFetch<{ perfumeId: string; wishlisted: boolean }>("/api/wishlist", {
      method: "DELETE",
      body: JSON.stringify({ perfumeId }),
    }),
};

export interface CardCheckoutResult {
  type: "card";
  sessionId: string;
  url: string;
  orderNumber: string;
  amount: number;
  currency: string;
}

export interface CodCheckoutResult {
  type: "cod";
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
}

export type CheckoutResult = CardCheckoutResult | CodCheckoutResult;

export const ordersApi = {
  list: () => apiFetch<ApiOrder[]>("/api/orders"),
  get: (id: string) => apiFetch<ApiOrder>(`/api/orders/${id}`),
};

// ---------------------------------------------------------------------------
//  Returns portal (Phase 8)
// ---------------------------------------------------------------------------

export interface CreateReturnPayload {
  orderId: string;
  reason: string;
  description?: string;
  items: { orderItemId: string; quantity: number }[];
}

export const returnsApi = {
  list: () => apiFetch<ApiReturnRequest[]>("/api/returns"),
  get: (id: string) => apiFetch<ApiReturnRequest>(`/api/returns/${id}`),
  create: (payload: CreateReturnPayload) =>
    apiFetch<ApiReturnRequest>("/api/returns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const adminReturnsApi = {
  list: (params: { status?: string; q?: string } = {}) =>
    apiFetch<ApiReturnRequest[]>(
      `/api/admin/returns${buildPerfumeQuery(params)}`,
    ),
  update: (
    id: string,
    body: {
      status?: string;
      adminNotes?: string;
      refundAmount?: number;
      refundMethod?: "card" | "voucher";
      trackingNumber?: string;
    },
  ) =>
    apiFetch<ApiReturnRequest>(`/api/admin/returns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export interface AffiliateApplyPayload {
  code: string;
  bio?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  paypalEmail?: string;
}

export const affiliateApi = {
  dashboard: () =>
    apiFetch<AffiliateDashboardData | null>("/api/affiliate/dashboard"),
  apply: (payload: AffiliateApplyPayload) =>
    apiFetch<AffiliateDashboardData>("/api/affiliate/apply", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export interface CampaignListResult {
  campaigns: ApiCampaign[];
  segmentCounts: Record<string, number>;
}

export const adminCampaignsApi = {
  list: async (): Promise<CampaignListResult> => {
    const res = await fetch("/api/admin/campaigns");
    const body = (await res.json()) as ApiEnvelope<ApiCampaign[]>;
    if (!res.ok || body.error) {
      throw new ApiError(body.error ?? `Eroare (${res.status})`, res.status);
    }
    return {
      campaigns: body.data ?? [],
      segmentCounts:
        (body.meta?.segmentCounts as Record<string, number>) ?? {},
    };
  },
  create: (body: Record<string, unknown>) =>
    apiFetch<ApiCampaign>("/api/admin/campaigns", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Record<string, unknown>) =>
    apiFetch<ApiCampaign>(`/api/admin/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/api/admin/campaigns/${id}`, {
      method: "DELETE",
    }),
  send: (id: string) =>
    apiFetch<ApiCampaign>(`/api/admin/campaigns/${id}/send`, {
      method: "POST",
    }),
  preview: (id: string) =>
    apiFetch<{ sent: boolean; to: string }>(
      `/api/admin/campaigns/${id}/preview`,
    ),
};

export const adminAffiliatesApi = {
  list: () => apiFetch<AdminAffiliateRow[]>("/api/admin/affiliates"),
  update: (
    id: string,
    body: { status?: string; commissionRate?: number },
  ) =>
    apiFetch<AdminAffiliateRow>(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  payout: (
    id: string,
    body: { amount: number; reference?: string; method?: string },
  ) =>
    apiFetch<AdminAffiliateRow>(`/api/admin/affiliates/${id}/payout`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const adminAnalyticsApi = {
  get: (period: AnalyticsPeriod) =>
    apiFetch<AdminAnalytics>(`/api/admin/analytics?period=${period}`),
};

export interface CouponValidation {
  valid: boolean;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  discountAmount: number;
}

export const couponsApi = {
  validate: (code: string, subtotal: number) =>
    apiFetch<CouponValidation>("/api/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, subtotal }),
    }),
};

export interface GiftCardValidationResult {
  valid: boolean;
  code: string;
  currency: string;
  remainingValue: number;
  maxRedeemable: number;
}

export interface GiftCardPurchaseResult {
  url: string;
  sessionId: string;
  code: string;
}

export interface MyGiftCard {
  id: string;
  code: string;
  initialValue: number;
  remainingValue: number;
  currency: string;
  recipientEmail: string | null;
  recipientName: string | null;
  relation: "purchased" | "received";
  isActive: boolean;
  isDepleted: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export const giftCardsApi = {
  validate: (code: string, cartSubtotal: number) =>
    apiFetch<GiftCardValidationResult>("/api/gift-cards/validate", {
      method: "POST",
      body: JSON.stringify({ code, cartSubtotal }),
    }),
  purchase: (body: {
    value: number;
    recipientEmail: string;
    recipientName: string;
    personalMessage?: string;
  }) =>
    apiFetch<GiftCardPurchaseResult>("/api/gift-cards/purchase", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  my: () => apiFetch<MyGiftCard[]>("/api/gift-cards/my"),
};

export interface ReviewsResult {
  items: ApiReview[];
  rating: RatingSummary;
  pagination: NonNullable<ApiEnvelope<ApiReview[]>["meta"]>["pagination"];
}

// UGC gallery item (Phase 8) — an approved review with images + its perfume.
export interface UGCGalleryItem extends ApiReview {
  perfume: {
    name: string;
    slug: string;
    houseName: string;
  };
}

export const reviewsApi = {
  gallery: (limit = 12) =>
    apiFetch<UGCGalleryItem[]>(
      `/api/reviews?hasImages=true&limit=${limit}`,
    ),
};

// ---------------------------------------------------------------------------
//  Loyalty & referrals (Phase 6)
// ---------------------------------------------------------------------------

export interface LoyaltyTransactionDto {
  id: string;
  points: number;
  type: string;
  description: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface LoyaltySummary {
  balance: number;
  lifetime: number;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  nextTier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | null;
  nextTierPoints: number;
  expiringThisMonth: number;
  transactions: LoyaltyTransactionDto[];
}

export interface RedeemResult {
  discountAmount: number;
  couponCode: string;
  pointsSpent: number;
}

export const loyaltyApi = {
  get: () => apiFetch<LoyaltySummary>("/api/loyalty"),
  redeem: (points: number) =>
    apiFetch<RedeemResult>("/api/loyalty/redeem", {
      method: "POST",
      body: JSON.stringify({ points }),
    }),
};

export interface ReferralFriend {
  id: string;
  email: string;
  status: "PENDING" | "REGISTERED" | "COMPLETED";
  createdAt: string;
}

export interface ReferralSummary {
  code: string;
  link: string;
  stats: { invited: number; completed: number; pointsEarned: number };
  friends: ReferralFriend[];
}

export const referralApi = {
  get: () => apiFetch<ReferralSummary>("/api/referral"),
  validate: (code: string) =>
    apiFetch<{ valid: boolean; referrerName: string | null }>(
      "/api/referral/validate",
      { method: "POST", body: JSON.stringify({ code }) },
    ),
};

// ---------------------------------------------------------------------------
//  Flash sales (Phase 6)
// ---------------------------------------------------------------------------

export interface FlashSaleProductDto {
  id: string;
  variantId: string;
  salePrice: number;
  originalPrice: number;
  discountPercent: number;
  stockLimit: number | null;
  unitsSold: number;
  sizeML: number | null;
  perfumeName: string | null;
  perfumeSlug: string | null;
  houseName: string | null;
  imageUrl: string | null;
}

export interface ActiveFlashSale {
  id: string;
  title: string;
  description: string | null;
  bannerColor: string;
  startsAt: string;
  endsAt: string;
  products: FlashSaleProductDto[];
}

export const flashSalesApi = {
  active: () => apiFetch<ActiveFlashSale | null>("/api/flash-sales/active"),
};

export interface AdminVariantOption {
  id: string;
  sku: string;
  sizeML: number;
  price: number;
  currency: string;
  perfumeName: string;
  houseName: string;
  label: string;
}

export const adminVariantsApi = {
  search: (q: string) =>
    apiFetch<AdminVariantOption[]>(
      `/api/admin/variants${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),
};

export interface AdminFlashSaleProduct {
  id: string;
  variantId: string;
  perfumeName: string;
  houseName: string;
  sizeML: number;
  originalPrice: number;
  salePrice: number;
  stockLimit: number | null;
  unitsSold: number;
}

export interface AdminFlashSale {
  id: string;
  title: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  bannerColor: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  status: "active" | "scheduled" | "expired";
  products: AdminFlashSaleProduct[];
}

export interface FlashSaleProductInput {
  variantId: string;
  salePrice: number;
  stockLimit?: number | null;
}

export interface CreateFlashSaleBody {
  title: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  startsAt: string;
  endsAt: string;
  bannerColor: string;
  isActive: boolean;
  products: FlashSaleProductInput[];
}

export const adminFlashSalesApi = {
  list: () => apiFetch<AdminFlashSale[]>("/api/admin/flash-sales"),
  create: (body: CreateFlashSaleBody) =>
    apiFetch<{ id: string }>("/api/admin/flash-sales", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<CreateFlashSaleBody>) =>
    apiFetch<{ id: string }>(`/api/admin/flash-sales/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    apiFetch<{ id: string; deleted: boolean }>(`/api/admin/flash-sales/${id}`, {
      method: "DELETE",
    }),
};

// ---------------------------------------------------------------------------
//  Subscriptions (Phase 6)
// ---------------------------------------------------------------------------

export interface SubscriptionPlanDto {
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

export interface BoxPreferencesDto {
  families: string[];
  excludeNotes: string[];
  gender: "MASCULINE" | "FEMININE" | "UNISEX" | "SURPRISE";
}

export interface SubscriptionBoxDto {
  id: string;
  month: string;
  status: string;
  trackingNumber: string | null;
  contents: unknown;
  shippedAt: string | null;
  createdAt: string;
}

export interface MySubscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  preferences: BoxPreferencesDto | null;
  plan: SubscriptionPlanDto;
  boxes: SubscriptionBoxDto[];
}

export const subscriptionApi = {
  plans: () => apiFetch<SubscriptionPlanDto[]>("/api/subscription/plans"),
  my: () => apiFetch<MySubscription | null>("/api/subscription/my"),
  subscribe: (planId: string, preferences: BoxPreferencesDto) =>
    apiFetch<{ url: string; sessionId: string }>("/api/subscription/subscribe", {
      method: "POST",
      body: JSON.stringify({ planId, preferences }),
    }),
  cancel: () =>
    apiFetch<{ cancelAtPeriodEnd: boolean; endsAt: string }>(
      "/api/subscription/cancel",
      { method: "POST" },
    ),
  pause: () =>
    apiFetch<{ status: string }>("/api/subscription/pause", { method: "POST" }),
  updatePreferences: (preferences: BoxPreferencesDto) =>
    apiFetch<{ preferences: BoxPreferencesDto }>("/api/subscription/preferences", {
      method: "PATCH",
      body: JSON.stringify(preferences),
    }),
};

export interface AdminSubscriptionRow {
  id: string;
  user: string;
  email: string;
  plan: string;
  status: string;
  startedAt: string;
  nextBilling: string;
  cancelAtPeriodEnd: boolean;
}

export interface AdminBoxRow {
  id: string;
  month: string;
  status: string;
  trackingNumber: string | null;
  contents: unknown;
  user: string;
  plan: string;
}

export interface AdminSubscriptionsData {
  stats: {
    activeCount: number;
    mrr: number;
    churnThisMonth: number;
    totalSubscribers: number;
  };
  subscriptions: AdminSubscriptionRow[];
  boxesThisMonth: AdminBoxRow[];
}

export const adminSubscriptionsApi = {
  list: () => apiFetch<AdminSubscriptionsData>("/api/admin/subscriptions"),
  updateBox: (
    boxId: string,
    body: { status?: string; trackingNumber?: string | null },
  ) =>
    apiFetch<{ id: string; status: string }>(
      `/api/admin/subscriptions/${boxId}/box`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
};

// ---------------------------------------------------------------------------
//  Waitlist & pre-orders (Phase 9)
// ---------------------------------------------------------------------------

export interface WaitlistJoinResult {
  joined: boolean;
  alreadyJoined: boolean;
  message: string;
}

export interface MyPreOrder {
  id: string;
  status: "PENDING" | "PAID" | "FULFILLED" | "CANCELLED";
  quantity: number;
  expectedDate: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  sizeML: number;
  unitPrice: number;
  perfumeName: string;
  perfumeSlug: string;
  houseName: string;
  imageUrl: string | null;
}

export const waitlistApi = {
  join: (body: { perfumeId: string; email: string; firstName?: string }) =>
    apiFetch<WaitlistJoinResult>("/api/waitlist", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const preordersApi = {
  create: (variantId: string, quantity = 1) =>
    apiFetch<{ sessionUrl: string; sessionId: string }>("/api/preorders", {
      method: "POST",
      body: JSON.stringify({ variantId, quantity }),
    }),
  my: () => apiFetch<MyPreOrder[]>("/api/preorders/my"),
};

export interface AdminLaunchRow {
  id: string;
  name: string;
  slug: string;
  houseName: string;
  isComingSoon: boolean;
  waitlistOpen: boolean;
  preOrderOpen: boolean;
  launchDate: string | null;
  waitlistCount: number;
  notifiedCount: number;
  preOrderCount: number;
}

export const adminLaunchesApi = {
  list: () => apiFetch<AdminLaunchRow[]>("/api/admin/waitlist"),
  setFlags: (
    perfumeId: string,
    body: {
      isComingSoon?: boolean;
      waitlistOpen?: boolean;
      preOrderOpen?: boolean;
      launchDate?: string | null;
    },
  ) =>
    apiFetch<{
      id: string;
      isComingSoon: boolean;
      waitlistOpen: boolean;
      preOrderOpen: boolean;
      launchDate: string | null;
    }>(`/api/admin/waitlist/${perfumeId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  notify: (perfumeId: string) =>
    apiFetch<{ notified: number; emailsSent: number }>(
      `/api/admin/waitlist/${perfumeId}/notify`,
      { method: "POST" },
    ),
  fulfill: (preOrderId: string) =>
    apiFetch<{ orderId: string; orderNumber: string }>(
      `/api/admin/preorders/${preOrderId}`,
      { method: "PATCH", body: JSON.stringify({ status: "FULFILLED" }) },
    ),
  cancelPreOrder: (preOrderId: string) =>
    apiFetch<{ refunded: boolean }>(`/api/admin/preorders/${preOrderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED" }),
    }),
};

// ---------------------------------------------------------------------------
//  B2B Wholesale (Phase 9)
// ---------------------------------------------------------------------------

export interface WholesaleOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
}

export interface MyWholesale {
  hasAccount: boolean;
  status?: "PENDING" | "ACTIVE" | "SUSPENDED";
  companyName?: string;
  cui?: string | null;
  discountRate?: number;
  creditLimit?: number | null;
  approvedAt?: string | null;
  orders?: WholesaleOrderRow[];
}

export const wholesaleApi = {
  my: () => apiFetch<MyWholesale>("/api/wholesale/my"),
  apply: (body: {
    companyName: string;
    cui?: string;
    website?: string;
    message?: string;
  }) =>
    apiFetch<{ id: string; status: string }>("/api/wholesale/apply", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export interface AdminWholesaleRow {
  id: string;
  companyName: string;
  cui: string | null;
  website: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  discountRate: number;
  creditLimit: number | null;
  notes: string | null;
  approvedAt: string | null;
  createdAt: string;
  email: string;
  contactName: string | null;
  orderCount: number;
  totalRevenue: number;
}

export const adminWholesaleApi = {
  list: () => apiFetch<AdminWholesaleRow[]>("/api/admin/wholesale"),
  update: (
    id: string,
    body: {
      status?: "PENDING" | "ACTIVE" | "SUSPENDED";
      discountRate?: number;
      creditLimit?: number | null;
      notes?: string;
    },
  ) =>
    apiFetch<{ id: string; status: string; discountRate: number }>(
      `/api/admin/wholesale/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
};

// ---------------------------------------------------------------------------
//  Scent DNA profile (Phase 9)
// ---------------------------------------------------------------------------

export interface ScentProfileDto {
  topFamilies: { slug: string; name: string; colorHex: string; score: number; percentage: number }[];
  topNotes: { slug: string; name: string; count: number }[];
  concentrationPreference: string;
  concentrationBreakdown: { concentration: string; percentage: number }[];
  genderPreference: string;
  preferredHouses: { slug: string; name: string; count: number }[];
  profileType: string;
  profileDescription: string;
  completeness: number;
  needsMoreData: boolean;
  signalCount: number;
}

export const scentProfileApi = {
  get: () => apiFetch<ScentProfileDto>("/api/scent-profile"),
};

// ---------------------------------------------------------------------------
//  Subscription box curation (Phase 9, admin)
// ---------------------------------------------------------------------------

export interface BoxCurationItem {
  variantId: string;
  sizeML: number;
  perfumeName: string;
  houseName: string;
}

export interface BoxCurationState {
  month: string;
  boxCount: number;
  contents: BoxCurationItem[];
  curatorNote: string;
  statusCounts: Record<string, number>;
}

export const adminBoxCurationApi = {
  get: (month: string) =>
    apiFetch<BoxCurationState>(
      `/api/admin/subscriptions/box-curation?month=${month}`,
    ),
  save: (body: {
    month: string;
    contents: BoxCurationItem[];
    curatorNote?: string;
    markCurating?: boolean;
    previewEmail?: boolean;
  }) =>
    apiFetch<{ updated?: number; previewSent?: boolean; to?: string }>(
      "/api/admin/subscriptions/box-curation",
      { method: "PATCH", body: JSON.stringify(body) },
    ),
};

// ---------------------------------------------------------------------------
//  Admin product videos (Phase 9)
// ---------------------------------------------------------------------------

export interface ProductVideoDto {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  duration: number | null;
  position: number;
  isActive: boolean;
}

export const adminVideosApi = {
  list: (slug: string) =>
    apiFetch<ProductVideoDto[]>(`/api/admin/products/${slug}/videos`),
  create: (
    slug: string,
    body: { url: string; thumbnailUrl?: string; title?: string; duration?: number },
  ) =>
    apiFetch<ProductVideoDto>(`/api/admin/products/${slug}/videos`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (
    slug: string,
    videoId: string,
    body: { position?: number; isActive?: boolean; title?: string },
  ) =>
    apiFetch<{ id: string; isActive: boolean }>(
      `/api/admin/products/${slug}/videos/${videoId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  remove: (slug: string, videoId: string) =>
    apiFetch<{ deleted: boolean }>(
      `/api/admin/products/${slug}/videos/${videoId}`,
      { method: "DELETE" },
    ),
  reorder: (slug: string, order: string[]) =>
    apiFetch<{ reordered: number }>(`/api/admin/products/${slug}/videos`, {
      method: "PATCH",
      body: JSON.stringify({ order }),
    }),
};
