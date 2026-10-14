import { Prisma } from "@prisma/client";
import { db } from "./db";
import { slugify, generateSku } from "./utils";
import { indexPerfume } from "./algolia";
import { perfumeToSearchRecord } from "./serializers";
import { perfumeDetailArgs, type PerfumeDetailPayload } from "@/types";
import type { CreatePerfumeInput } from "./validations/product";

/**
 * Create a perfume with its variants, inventory rows, images and note
 * assignments in a single Prisma write, then best-effort index it in Algolia.
 * Shared by `POST /api/perfumes` and `POST /api/admin/products`.
 */
export async function createPerfume(
  input: CreatePerfumeInput,
): Promise<PerfumeDetailPayload> {
  const slug = input.slug ?? slugify(input.name);

  // Guarantee exactly-one primary image when images are supplied.
  const images = input.images.map((img, index) => ({
    url: img.url,
    altText: img.altText ?? null,
    position: img.position || index,
    isPrimary: img.isPrimary,
  }));
  if (images.length > 0 && !images.some((img) => img.isPrimary)) {
    images[0]!.isPrimary = true;
  }

  const data: Prisma.PerfumeCreateInput = {
    name: input.name,
    slug,
    description: input.description,
    story: input.story ?? null,
    descriptionEn: input.descriptionEn ?? null,
    storyEn: input.storyEn ?? null,
    gender: input.gender,
    concentration: input.concentration,
    launchYear: input.launchYear ?? null,
    perfumer: input.perfumer ?? null,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
    metaTitle: input.metaTitle ?? null,
    metaDescription: input.metaDescription ?? null,
    house: { connect: { id: input.houseId } },
    family: { connect: { id: input.familyId } },
    images: { create: images },
    variants: {
      create: input.variants.map((v) => ({
        sizeML: v.sizeML,
        price: v.price,
        currency: v.currency,
        sku: v.sku ?? generateSku(slug, v.sizeML),
        isActive: v.isActive,
        inventory: {
          create: {
            quantity: v.initialQuantity,
            lowStockThreshold: v.lowStockThreshold,
          },
        },
      })),
    },
    notes: {
      create: input.notes.map((n) => ({
        position: n.position,
        note: { connect: { id: n.noteId } },
      })),
    },
  };

  const perfume = await db.perfume.create({ data, ...perfumeDetailArgs });

  // Best-effort search indexing — never fail the write on an Algolia hiccup.
  try {
    await indexPerfume(perfumeToSearchRecord(perfume));
  } catch (err) {
    console.error("[Algolia] indexPerfume failed:", err);
  }

  return perfume;
}
