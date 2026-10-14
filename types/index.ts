import { Prisma } from "@prisma/client";
import type {
  Gender,
  Concentration,
  OrderStatus,
  PaymentMethod,
  NotePosition,
  UserRole,
  CouponType,
} from "@prisma/client";

// ============================================================================
//  Prisma query argument presets + derived payload types
//  Using `Prisma.validator` preserves literal types (orderBy "asc"/"desc"),
//  so the derived `*GetPayload` types stay precise.
// ============================================================================

const primaryImageOrder = [
  { isPrimary: Prisma.SortOrder.desc },
  { position: Prisma.SortOrder.asc },
];

/** Perfume args for listing/grid views (primary image + active variants). */
export const perfumeListArgs = Prisma.validator<Prisma.PerfumeDefaultArgs>()({
  include: {
    house: {
      select: { id: true, name: true, slug: true, logoUrl: true, country: true },
    },
    family: {
      select: { id: true, name: true, slug: true, colorHex: true, iconName: true },
    },
    images: { orderBy: primaryImageOrder, take: 1 },
    variants: {
      where: { isActive: true },
      include: { inventory: true },
      orderBy: { sizeML: Prisma.SortOrder.asc },
    },
  },
});
export type PerfumeListPayload = Prisma.PerfumeGetPayload<typeof perfumeListArgs>;

/** Full perfume args for the product-detail page. */
export const perfumeDetailArgs = Prisma.validator<Prisma.PerfumeDefaultArgs>()({
  include: {
    house: true,
    family: true,
    images: { orderBy: primaryImageOrder },
    videos: {
      where: { isActive: true },
      orderBy: { position: Prisma.SortOrder.asc },
    },
    variants: {
      where: { isActive: true },
      include: { inventory: true },
      orderBy: { sizeML: Prisma.SortOrder.asc },
    },
    notes: { include: { note: true } },
  },
});
export type PerfumeDetailPayload = Prisma.PerfumeGetPayload<
  typeof perfumeDetailArgs
>;
/** Brief alias matching the project's naming convention. */
export type PerfumeWithDetails = PerfumeDetailPayload;

/** Cart args with items → variant → perfume (+ primary image, house). */
export const cartArgs = Prisma.validator<Prisma.CartDefaultArgs>()({
  include: {
    items: {
      orderBy: { createdAt: Prisma.SortOrder.asc },
      include: {
        bundle: { select: { id: true, name: true, slug: true } },
        variant: {
          include: {
            inventory: true,
            perfume: {
              include: {
                house: { select: { id: true, name: true, slug: true } },
                images: { orderBy: primaryImageOrder, take: 1 },
              },
            },
          },
        },
      },
    },
  },
});
export type CartPayload = Prisma.CartGetPayload<typeof cartArgs>;
export type CartWithItems = CartPayload;

/** Order args with items, owning user and coupon. */
export const orderArgs = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    items: {
      orderBy: { createdAt: Prisma.SortOrder.asc },
      include: {
        variant: {
          include: {
            perfume: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    },
    user: {
      select: { id: true, email: true, firstName: true, lastName: true },
    },
    coupon: { select: { code: true, type: true, value: true } },
  },
});
export type OrderPayload = Prisma.OrderGetPayload<typeof orderArgs>;
export type OrderWithItems = OrderPayload;

/** House args with its active perfumes (for the house detail page). */
export const houseWithPerfumesArgs =
  Prisma.validator<Prisma.PerfumeHouseDefaultArgs>()({
    include: {
      perfumes: {
        where: { isActive: true },
        include: {
          house: {
            select: { id: true, name: true, slug: true, logoUrl: true, country: true },
          },
          family: {
            select: { id: true, name: true, slug: true, colorHex: true, iconName: true },
          },
          images: { orderBy: primaryImageOrder, take: 1 },
          variants: {
            where: { isActive: true },
            include: { inventory: true },
            orderBy: { sizeML: Prisma.SortOrder.asc },
          },
        },
        orderBy: { createdAt: Prisma.SortOrder.desc },
      },
    },
  });
export type HouseWithPerfumesPayload = Prisma.PerfumeHouseGetPayload<
  typeof houseWithPerfumesArgs
>;

// ============================================================================
//  Serialized API DTOs — money as `number`, dates as ISO `string`.
// ============================================================================

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  county: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface ApiImage {
  id: string;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
}

/** Flash-sale pricing attached to a variant or list item when one is live. */
export interface ApiFlashSale {
  salePrice: number;
  originalPrice: number;
  /** e.g. "-30%". */
  discountLabel: string;
  /** ISO timestamp the sale price reverts. */
  endsAt: string;
  title?: string;
}

export interface ApiVariant {
  id: string;
  sizeML: number;
  price: number;
  currency: string;
  sku: string;
  isActive: boolean;
  inStock: boolean;
  availableQuantity: number;
  isLowStock: boolean;
  flashSale?: ApiFlashSale | null;
}

export interface ApiHouseSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string;
}

export interface ApiHouseDetail extends ApiHouseSummary {
  description: string | null;
  story: string | null;
  coverImageUrl: string | null;
  foundedYear: number | null;
  website: string | null;
  isActive: boolean;
}

export interface ApiFamilySummary {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
  iconName: string | null;
}

export interface ApiNoteRef {
  id: string;
  name: string;
  slug: string;
  family: string;
}

export interface OlfactoryPyramid {
  top: ApiNoteRef[];
  heart: ApiNoteRef[];
  base: ApiNoteRef[];
}

export interface RatingSummary {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ApiPerfumeListItem {
  id: string;
  name: string;
  slug: string;
  gender: Gender;
  concentration: Concentration;
  launchYear: number | null;
  isFeatured: boolean;
  isComingSoon: boolean;
  house: ApiHouseSummary;
  family: ApiFamilySummary;
  primaryImage: ApiImage | null;
  priceRange: PriceRange;
  inStock: boolean;
  rating: { average: number; count: number };
  flashSale?: ApiFlashSale | null;
}

export interface ApiPerfumeDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  story: string | null;
  gender: Gender;
  concentration: Concentration;
  launchYear: number | null;
  perfumer: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isComingSoon: boolean;
  launchDate: string | null;
  waitlistOpen: boolean;
  preOrderOpen: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  house: ApiHouseDetail;
  family: ApiFamilySummary;
  images: ApiImage[];
  videos: ApiProductVideo[];
  variants: ApiVariant[];
  pyramid: OlfactoryPyramid;
  priceRange: PriceRange;
  rating: RatingSummary;
}

export interface ApiProductVideo {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  duration: number | null;
}

export interface ApiCartItem {
  id: string;
  quantity: number;
  reservedUntil: string | null;
  lineTotal: number;
  isAvailable: boolean;
  bundleId: string | null;
  bundleName: string | null;
  variant: ApiVariant & {
    perfume: {
      id: string;
      name: string;
      slug: string;
      primaryImage: ApiImage | null;
      house: { id: string; name: string; slug: string };
    };
  };
}

export interface ApiCart {
  id: string;
  currency: string;
  items: ApiCartItem[];
  itemCount: number;
  subtotal: number;
}

export interface ApiOrderItem {
  id: string;
  perfumeName: string;
  houseName: string;
  perfumeSlug: string | null;
  sizeML: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ApiOrderCustomer {
  id: string;
  email: string;
  name: string;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: ShippingAddress;
  notes: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  couponCode: string | null;
  affiliateCode: string | null;
  items: ApiOrderItem[];
  customer?: ApiOrderCustomer;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface ApiReviewImage {
  id: string;
  url: string;
  altText: string | null;
}

export interface ApiReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  author: {
    name: string;
    imageUrl: string | null;
  };
  videoUrl: string | null;
  images: ApiReviewImage[];
}

export interface LowStockItem {
  variantId: string;
  sku: string;
  perfumeName: string;
  sizeML: number;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
}

export interface AdminDashboardStats {
  revenue: {
    total: number;
    currency: string;
  };
  totalOrders: number;
  orderCountsByStatus: Record<OrderStatus, number>;
  lowStockItems: LowStockItem[];
  pendingReviews: number;
  totalCustomers: number;
}

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "12m";

export interface AdminAnalytics {
  period: AnalyticsPeriod;
  revenue: {
    total: number;
    previous: number;
    currency: string;
    byDay: { date: string; amount: number }[];
  };
  orders: {
    total: number;
    previous: number;
    byStatus: Record<OrderStatus, number>;
    byDay: { date: string; count: number }[];
  };
  topPerfumes: {
    id: string;
    name: string;
    houseName: string;
    unitsSold: number;
    revenue: number;
    imageUrl: string | null;
  }[];
  topHouses: {
    id: string;
    name: string;
    revenue: number;
    orderCount: number;
  }[];
  customers: {
    total: number;
    new: number;
    returning: number;
  };
  lowStock: {
    variantId: string;
    perfumeName: string;
    houseName: string;
    sizeML: number;
    quantity: number;
    threshold: number;
  }[];
}

// Re-export Prisma enums as values/types for convenient app-wide imports.
export type {
  Gender,
  Concentration,
  OrderStatus,
  NotePosition,
  UserRole,
  CouponType,
};
