import { Prisma } from "@prisma/client";
import { db } from "./db";
import { toNumber } from "./utils";
import { getLocalizedField } from "./i18n-content";

// Bundle args: items → variant → perfume (name/slug/primary image/house).
const bundleArgs = Prisma.validator<Prisma.BundleDefaultArgs>()({
  include: {
    items: {
      include: {
        variant: {
          include: {
            perfume: {
              select: {
                name: true,
                slug: true,
                house: { select: { name: true } },
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    },
  },
});

export type BundlePayload = Prisma.BundleGetPayload<typeof bundleArgs>;

export interface ApiBundleItem {
  variantId: string;
  perfumeName: string;
  perfumeSlug: string;
  houseName: string;
  sizeML: number;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
}

export interface ApiBundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  isFeatured: boolean;
  items: ApiBundleItem[];
  individualTotal: number;
  savings: number;
}

export function serializeBundle(
  bundle: BundlePayload,
  locale = "ro",
): ApiBundle {
  const items: ApiBundleItem[] = bundle.items.map((item) => ({
    variantId: item.variantId,
    perfumeName: item.variant.perfume.name,
    perfumeSlug: item.variant.perfume.slug,
    houseName: item.variant.perfume.house.name,
    sizeML: toNumber(item.variant.sizeML),
    unitPrice: toNumber(item.variant.price),
    quantity: item.quantity,
    imageUrl: item.variant.perfume.images[0]?.url ?? null,
  }));

  const individualTotal =
    Math.round(
      items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) * 100,
    ) / 100;
  const price = toNumber(bundle.price);

  return {
    id: bundle.id,
    name: bundle.name,
    slug: bundle.slug,
    description: getLocalizedField(bundle, "description", locale),
    price,
    currency: bundle.currency,
    imageUrl: bundle.imageUrl,
    isFeatured: bundle.isFeatured,
    items,
    individualTotal,
    savings: Math.max(0, Math.round((individualTotal - price) * 100) / 100),
  };
}

/** All active bundles with their items, featured first. */
export async function getActiveBundles(locale = "ro"): Promise<ApiBundle[]> {
  const bundles = await db.bundle.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    ...bundleArgs,
  });
  return bundles.map((b) => serializeBundle(b, locale));
}

/** A single active bundle by slug, or null. */
export async function getBundleBySlug(
  slug: string,
  locale = "ro",
): Promise<ApiBundle | null> {
  const bundle = await db.bundle.findFirst({
    where: { slug, isActive: true },
    ...bundleArgs,
  });
  return bundle ? serializeBundle(bundle, locale) : null;
}
