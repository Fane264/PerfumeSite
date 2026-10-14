import { Prisma } from "@prisma/client";
import type { PerfumeHouse, PerfumeImage, NotePosition } from "@prisma/client";
import { toNumber, availableStock } from "./utils";
import { DEFAULT_CURRENCY } from "./constants";
import type { PerfumeSearchRecord } from "./algolia";
import type { FlashSaleVariantInfo } from "./flash-sales";
import type {
  ApiCart,
  ApiCartItem,
  ApiFamilySummary,
  ApiFlashSale,
  ApiHouseDetail,
  ApiHouseSummary,
  ApiImage,
  ApiOrder,
  ApiPerfumeDetail,
  ApiPerfumeListItem,
  ApiReview,
  ApiVariant,
  CartPayload,
  OlfactoryPyramid,
  OrderPayload,
  PerfumeDetailPayload,
  PerfumeListPayload,
  PriceRange,
  RatingSummary,
  ShippingAddress,
} from "@/types";

/** Map of variantId → live flash-sale pricing (empty when none active). */
export type FlashSaleMap = Map<string, FlashSaleVariantInfo>;

function flashSaleDto(
  basePrice: number,
  info: FlashSaleVariantInfo,
): ApiFlashSale {
  return {
    salePrice: info.salePrice,
    originalPrice: basePrice,
    discountLabel: info.discountLabel,
    endsAt: info.endsAt.toISOString(),
    title: info.title,
  };
}

type VariantWithInventory = Prisma.DecantVariantGetPayload<{
  include: { inventory: true };
}>;

type HouseSummaryInput = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string;
};

type FamilySummaryInput = {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
  iconName: string | null;
};

type PyramidNoteInput = {
  position: NotePosition;
  note: { id: string; name: string; slug: string; family: string };
};

type ReviewWithAuthor = Prisma.ReviewGetPayload<{
  include: {
    user: { select: { firstName: true; lastName: true; imageUrl: true } };
  };
}> & {
  // Optional UGC images — present only when the query includes them.
  images?: { id: string; url: string; altText: string | null }[];
};

// ----------------------------------------------------------------------------
//  Atomic serializers
// ----------------------------------------------------------------------------

export function serializeImage(img: PerfumeImage): ApiImage {
  return {
    id: img.id,
    url: img.url,
    altText: img.altText,
    position: img.position,
    isPrimary: img.isPrimary,
  };
}

export function serializeVariant(
  variant: VariantWithInventory,
  flashSale?: FlashSaleVariantInfo | null,
): ApiVariant {
  const quantity = variant.inventory?.quantity ?? 0;
  const reserved = variant.inventory?.reservedQuantity ?? 0;
  const threshold = variant.inventory?.lowStockThreshold ?? 0;
  const available = availableStock(quantity, reserved);
  const basePrice = toNumber(variant.price);
  return {
    id: variant.id,
    sizeML: toNumber(variant.sizeML),
    price: basePrice,
    currency: variant.currency,
    sku: variant.sku,
    isActive: variant.isActive,
    inStock: available > 0,
    availableQuantity: available,
    isLowStock: available > 0 && available <= threshold,
    flashSale: flashSale ? flashSaleDto(basePrice, flashSale) : null,
  };
}

export function priceRangeFromVariants(
  variants: VariantWithInventory[],
): PriceRange {
  if (variants.length === 0) {
    return { min: 0, max: 0, currency: DEFAULT_CURRENCY };
  }
  const prices = variants.map((v) => toNumber(v.price));
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    currency: variants[0]?.currency ?? DEFAULT_CURRENCY,
  };
}

export function variantsInStock(variants: VariantWithInventory[]): boolean {
  return variants.some(
    (v) =>
      availableStock(
        v.inventory?.quantity ?? 0,
        v.inventory?.reservedQuantity ?? 0,
      ) > 0,
  );
}

export function serializeHouseSummary(house: HouseSummaryInput): ApiHouseSummary {
  return {
    id: house.id,
    name: house.name,
    slug: house.slug,
    logoUrl: house.logoUrl,
    country: house.country,
  };
}

export function serializeHouseDetail(house: PerfumeHouse): ApiHouseDetail {
  return {
    id: house.id,
    name: house.name,
    slug: house.slug,
    logoUrl: house.logoUrl,
    country: house.country,
    description: house.description,
    story: house.story,
    coverImageUrl: house.coverImageUrl,
    foundedYear: house.foundedYear,
    website: house.website,
    isActive: house.isActive,
  };
}

export function serializeFamilySummary(
  family: FamilySummaryInput,
): ApiFamilySummary {
  return {
    id: family.id,
    name: family.name,
    slug: family.slug,
    colorHex: family.colorHex,
    iconName: family.iconName,
  };
}

export function buildPyramid(notes: PyramidNoteInput[]): OlfactoryPyramid {
  const pyramid: OlfactoryPyramid = { top: [], heart: [], base: [] };
  for (const entry of notes) {
    const ref = {
      id: entry.note.id,
      name: entry.note.name,
      slug: entry.note.slug,
      family: entry.note.family,
    };
    if (entry.position === "TOP") pyramid.top.push(ref);
    else if (entry.position === "HEART") pyramid.heart.push(ref);
    else pyramid.base.push(ref);
  }
  return pyramid;
}

// ----------------------------------------------------------------------------
//  Aggregate serializers
// ----------------------------------------------------------------------------

export function serializePerfumeListItem(
  perfume: PerfumeListPayload,
  rating: { average: number; count: number } = { average: 0, count: 0 },
  flashSaleByVariant?: FlashSaleMap,
): ApiPerfumeListItem {
  const primary = perfume.images[0];

  // Surface the deepest discount across the perfume's on-sale variants.
  let flashSale: ApiFlashSale | null = null;
  if (flashSaleByVariant && flashSaleByVariant.size > 0) {
    for (const variant of perfume.variants) {
      const info = flashSaleByVariant.get(variant.id);
      if (!info) continue;
      const dto = flashSaleDto(toNumber(variant.price), info);
      if (!flashSale || dto.salePrice < flashSale.salePrice) {
        flashSale = dto;
      }
    }
  }

  return {
    id: perfume.id,
    name: perfume.name,
    slug: perfume.slug,
    gender: perfume.gender,
    concentration: perfume.concentration,
    launchYear: perfume.launchYear,
    isFeatured: perfume.isFeatured,
    isComingSoon: perfume.isComingSoon,
    house: serializeHouseSummary(perfume.house),
    family: serializeFamilySummary(perfume.family),
    primaryImage: primary ? serializeImage(primary) : null,
    priceRange: priceRangeFromVariants(perfume.variants),
    inStock: variantsInStock(perfume.variants),
    rating,
    flashSale,
  };
}

export function serializePerfumeDetail(
  perfume: PerfumeDetailPayload,
  rating: RatingSummary,
  flashSaleByVariant?: FlashSaleMap,
): ApiPerfumeDetail {
  return {
    id: perfume.id,
    name: perfume.name,
    slug: perfume.slug,
    description: perfume.description,
    story: perfume.story,
    gender: perfume.gender,
    concentration: perfume.concentration,
    launchYear: perfume.launchYear,
    perfumer: perfume.perfumer,
    isActive: perfume.isActive,
    isFeatured: perfume.isFeatured,
    isComingSoon: perfume.isComingSoon,
    launchDate: perfume.launchDate ? perfume.launchDate.toISOString() : null,
    waitlistOpen: perfume.waitlistOpen,
    preOrderOpen: perfume.preOrderOpen,
    metaTitle: perfume.metaTitle,
    metaDescription: perfume.metaDescription,
    house: serializeHouseDetail(perfume.house),
    family: serializeFamilySummary(perfume.family),
    images: perfume.images.map(serializeImage),
    videos: (perfume.videos ?? []).map((v) => ({
      id: v.id,
      url: v.url,
      thumbnailUrl: v.thumbnailUrl,
      title: v.title,
      duration: v.duration,
    })),
    variants: perfume.variants.map((v) =>
      serializeVariant(v, flashSaleByVariant?.get(v.id) ?? null),
    ),
    pyramid: buildPyramid(perfume.notes),
    priceRange: priceRangeFromVariants(perfume.variants),
    rating,
  };
}

function serializeCartItem(item: CartPayload["items"][number]): ApiCartItem {
  const variantDto = serializeVariant(item.variant);
  const lineTotal = variantDto.price * item.quantity;
  const physicalQuantity = item.variant.inventory?.quantity ?? 0;
  const primary = item.variant.perfume.images[0];
  return {
    id: item.id,
    quantity: item.quantity,
    reservedUntil: item.reservedUntil ? item.reservedUntil.toISOString() : null,
    lineTotal,
    // Enough physical stock still exists to honour this line.
    isAvailable: item.variant.isActive && physicalQuantity >= item.quantity,
    bundleId: item.bundleId,
    bundleName: item.bundle?.name ?? null,
    variant: {
      ...variantDto,
      perfume: {
        id: item.variant.perfume.id,
        name: item.variant.perfume.name,
        slug: item.variant.perfume.slug,
        primaryImage: primary ? serializeImage(primary) : null,
        house: {
          id: item.variant.perfume.house.id,
          name: item.variant.perfume.house.name,
          slug: item.variant.perfume.house.slug,
        },
      },
    },
  };
}

export function serializeCart(cart: CartPayload): ApiCart {
  const items = cart.items.map(serializeCartItem);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    id: cart.id,
    currency: cart.items[0]?.variant.currency ?? DEFAULT_CURRENCY,
    items,
    itemCount,
    subtotal,
  };
}

export function serializeOrder(
  order: OrderPayload,
  options: { includeCustomer?: boolean } = {},
): ApiOrder {
  const items = order.items.map((item) => {
    const unitPrice = toNumber(item.priceAtPurchase);
    return {
      id: item.id,
      perfumeName: item.perfumeNameAtPurchase,
      houseName: item.houseNameAtPurchase,
      perfumeSlug: item.variant.perfume.slug,
      sizeML: toNumber(item.sizeMLAtPurchase),
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const dto: ApiOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    subtotal: toNumber(order.subtotal),
    shippingCost: toNumber(order.shippingCost),
    discount: toNumber(order.discount),
    total: toNumber(order.total),
    currency: order.currency,
    // Validated against the ShippingAddress shape at order-creation time.
    shippingAddress: order.shippingAddress as unknown as ShippingAddress,
    notes: order.notes,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    couponCode: order.coupon?.code ?? null,
    affiliateCode: order.affiliateCode,
    items,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
  };

  if (options.includeCustomer) {
    const fullName = `${order.user.firstName ?? ""} ${order.user.lastName ?? ""}`.trim();
    dto.customer = {
      id: order.user.id,
      email: order.user.email,
      name: fullName || order.user.email,
    };
  }

  return dto;
}

/** Flatten a fully-loaded perfume into an Algolia search record. */
export function perfumeToSearchRecord(
  perfume: PerfumeDetailPayload,
): PerfumeSearchRecord {
  const range = priceRangeFromVariants(perfume.variants);
  const inStock = variantsInStock(perfume.variants);
  return {
    objectID: perfume.id,
    name: perfume.name,
    slug: perfume.slug,
    description: perfume.description,
    house: perfume.house.name,
    houseSlug: perfume.house.slug,
    family: perfume.family.name,
    familySlug: perfume.family.slug,
    familyColor: perfume.family.colorHex,
    gender: perfume.gender,
    concentration: perfume.concentration,
    perfumer: perfume.perfumer,
    launchYear: perfume.launchYear,
    notes: perfume.notes.map((n) => n.note.name),
    minPrice: range.min,
    maxPrice: range.max,
    priceMin: range.min,
    currency: range.currency,
    isFeatured: perfume.isFeatured,
    inStock,
    available: inStock,
    imageUrl: perfume.images[0]?.url ?? null,
    createdAtTimestamp: perfume.createdAt.getTime(),
  };
}

export function serializeReview(review: ReviewWithAuthor): ApiReview {
  const first = review.user.firstName?.trim();
  const last = review.user.lastName?.trim();
  const name = first
    ? `${first}${last ? ` ${last.charAt(0)}.` : ""}`
    : "Client Decanturi";
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    isVerifiedPurchase: review.isVerifiedPurchase,
    helpfulCount: review.helpfulCount,
    createdAt: review.createdAt.toISOString(),
    author: {
      name,
      imageUrl: review.user.imageUrl,
    },
    videoUrl: review.videoUrl ?? null,
    images: (review.images ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.altText,
    })),
  };
}
