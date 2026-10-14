import {
  DiscountType,
  Prisma,
  type FlashSale,
  type FlashSaleProduct,
} from "@prisma/client";
import { db } from "./db";

export type FlashSaleWithProducts = FlashSale & {
  products: FlashSaleProduct[];
};

/** Filter matching a flash sale that is live right now. */
function liveWindow(now = new Date()): Prisma.FlashSaleWhereInput {
  return {
    isActive: true,
    startsAt: { lte: now },
    endsAt: { gt: now },
  };
}

/**
 * The single currently-running flash sale (most recently started wins if more
 * than one overlaps), with its products. `null` when nothing is live.
 */
export async function getActiveFlashSale(): Promise<FlashSaleWithProducts | null> {
  return db.flashSale.findFirst({
    where: liveWindow(),
    include: { products: true },
    orderBy: { startsAt: "desc" },
  });
}

/**
 * The live flash-sale line for a specific variant, or `null` if the variant
 * isn't on sale right now or its per-sale stock allocation is exhausted.
 */
export async function getFlashSaleForVariant(
  variantId: string,
): Promise<(FlashSaleProduct & { flashSale: FlashSale }) | null> {
  const product = await db.flashSaleProduct.findFirst({
    where: {
      variantId,
      flashSale: liveWindow(),
    },
    include: { flashSale: true },
    orderBy: { flashSale: { startsAt: "desc" } },
  });

  if (!product) return null;
  // Respect a per-sale stock cap once it's been sold through.
  if (product.stockLimit !== null && product.unitsSold >= product.stockLimit) {
    return null;
  }
  return product;
}

export interface EffectivePrice {
  price: Prisma.Decimal;
  isFlashSale: boolean;
  saleEndsAt?: Date;
  /** Original (pre-sale) price — only set when a sale applies. */
  originalPrice?: Prisma.Decimal;
  flashSaleProductId?: string;
}

/**
 * Resolve the price a customer actually pays for a variant, honouring any live
 * flash sale. Server-authoritative — checkout MUST price through this and never
 * trust a client-supplied amount.
 */
export async function getEffectivePrice(
  variantId: string,
  originalPrice: Prisma.Decimal,
): Promise<EffectivePrice> {
  const sale = await getFlashSaleForVariant(variantId);
  if (!sale) {
    return { price: originalPrice, isFlashSale: false };
  }
  return {
    price: sale.salePrice,
    isFlashSale: true,
    saleEndsAt: sale.flashSale.endsAt,
    originalPrice,
    flashSaleProductId: sale.id,
  };
}

/** Compute a sale price from an original price and a discount config. */
export function computeSalePrice(
  original: number,
  type: DiscountType,
  value: number,
): number {
  const raw =
    type === DiscountType.PERCENTAGE ? original * (1 - value / 100) : original - value;
  return Math.max(0, Math.round(raw * 100) / 100);
}

/** Human discount label for a sale line, e.g. `-30%` or `-15 RON`. */
export function discountLabel(
  type: DiscountType,
  value: number,
  currency = "RON",
): string {
  return type === DiscountType.PERCENTAGE
    ? `-${Math.round(value)}%`
    : `-${value} ${currency}`;
}

export interface FlashSaleVariantInfo {
  salePrice: number;
  originalPrice: number;
  discountLabel: string;
  endsAt: Date;
  title: string;
}

/** Percentage discount label derived from original vs sale price. */
function percentLabel(original: number, sale: number): string {
  if (original <= 0) return "-0%";
  return `-${Math.round((1 - sale / original) * 100)}%`;
}

/**
 * Map of every variant currently on the live flash sale → its sale pricing.
 * Built once and reused to enrich catalog listings without an N+1 query.
 * Respects per-line stock caps.
 */
export async function getActiveFlashSaleVariantMap(): Promise<
  Map<string, FlashSaleVariantInfo>
> {
  const sale = await getActiveFlashSale();
  const map = new Map<string, FlashSaleVariantInfo>();
  if (!sale) return map;

  for (const product of sale.products) {
    if (product.stockLimit !== null && product.unitsSold >= product.stockLimit) {
      continue;
    }
    const salePrice = product.salePrice.toNumber();
    const originalPrice = product.originalPrice.toNumber();
    map.set(product.variantId, {
      salePrice,
      originalPrice,
      discountLabel: percentLabel(originalPrice, salePrice),
      endsAt: sale.endsAt,
      title: sale.title,
    });
  }
  return map;
}
