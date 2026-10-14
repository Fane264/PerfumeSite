import { z } from "zod";
import { Gender, Concentration, NotePosition } from "@prisma/client";
import { booleanQueryParam, paginationSchema } from "./common";

export const genderSchema = z.nativeEnum(Gender);
export const concentrationSchema = z.nativeEnum(Concentration);
export const notePositionSchema = z.nativeEnum(NotePosition);

const currentYear = new Date().getFullYear();

// ----------------------------------------------------------------------------
//  GET /api/perfumes — list query
// ----------------------------------------------------------------------------

export const perfumeSortSchema = z
  .enum(["newest", "price_asc", "price_desc", "popular"])
  .default("newest");

export const perfumeQuerySchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    slugs: z.string().trim().min(1).optional(), // comma-separated perfume slugs
    house: z.string().trim().min(1).optional(), // house slug
    family: z.string().trim().min(1).optional(), // family slug
    notes: z.string().trim().min(1).optional(), // comma-separated note slugs
    gender: genderSchema.optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    sizeML: z.coerce.number().positive().optional(),
    available: booleanQueryParam.optional(),
    featured: booleanQueryParam.optional(),
    sort: perfumeSortSchema,
  })
  .merge(paginationSchema)
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    { message: "minPrice nu poate fi mai mare decât maxPrice", path: ["minPrice"] },
  );

// ----------------------------------------------------------------------------
//  Nested inputs for create/update
// ----------------------------------------------------------------------------

export const variantInputSchema = z.object({
  sizeML: z.number().positive(),
  price: z.number().nonnegative(),
  currency: z.string().min(1).default("RON"),
  sku: z.string().min(1).optional(), // auto-generated from slug + size if absent
  isActive: z.boolean().default(true),
  initialQuantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
});

export const perfumeImageInputSchema = z.object({
  url: z.string().url("URL de imagine invalid"),
  altText: z.string().optional(),
  position: z.number().int().nonnegative().default(0),
  isPrimary: z.boolean().default(false),
});

export const perfumeNoteInputSchema = z.object({
  noteId: z.string().min(1),
  position: notePositionSchema,
});

// ----------------------------------------------------------------------------
//  POST /api/perfumes — create
// ----------------------------------------------------------------------------

export const createPerfumeSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug invalid")
    .optional(), // derived from name when omitted
  description: z.string().min(1),
  story: z.string().optional(),
  descriptionEn: z.string().optional(),
  storyEn: z.string().optional(),
  houseId: z.string().min(1),
  familyId: z.string().min(1),
  gender: genderSchema,
  launchYear: z
    .number()
    .int()
    .min(1800)
    .max(currentYear + 1)
    .optional(),
  perfumer: z.string().optional(),
  concentration: concentrationSchema,
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  images: z.array(perfumeImageInputSchema).default([]),
  variants: z.array(variantInputSchema).min(1, "Cel puțin o variantă este necesară"),
  notes: z.array(perfumeNoteInputSchema).default([]),
});

// ----------------------------------------------------------------------------
//  PUT /api/perfumes/[slug] — update (nested collections optional; when
//  provided they fully replace the existing set).
// ----------------------------------------------------------------------------

export const updatePerfumeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug invalid")
    .optional(),
  description: z.string().min(1).optional(),
  story: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  storyEn: z.string().nullable().optional(),
  houseId: z.string().min(1).optional(),
  familyId: z.string().min(1).optional(),
  gender: genderSchema.optional(),
  launchYear: z
    .number()
    .int()
    .min(1800)
    .max(currentYear + 1)
    .nullable()
    .optional(),
  perfumer: z.string().nullable().optional(),
  concentration: concentrationSchema.optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  images: z.array(perfumeImageInputSchema).optional(),
  variants: z.array(variantInputSchema).optional(),
  notes: z.array(perfumeNoteInputSchema).optional(),
});

// ----------------------------------------------------------------------------
//  House schemas
// ----------------------------------------------------------------------------

export const createHouseSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug invalid")
    .optional(),
  description: z.string().optional(),
  story: z.string().optional(),
  descriptionEn: z.string().optional(),
  storyEn: z.string().optional(),
  countryEn: z.string().optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  country: z.string().min(1),
  foundedYear: z
    .number()
    .int()
    .min(1700)
    .max(currentYear + 1)
    .optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export const updateHouseSchema = createHouseSchema.partial();

// ----------------------------------------------------------------------------
//  Admin inventory adjustment
// ----------------------------------------------------------------------------

export const inventoryUpdateSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int(),
  operation: z.enum(["SET", "ADD", "SUBTRACT"]).default("SET"),
  lowStockThreshold: z.number().int().nonnegative().optional(),
});

export type PerfumeQueryInput = z.infer<typeof perfumeQuerySchema>;
export type CreatePerfumeInput = z.infer<typeof createPerfumeSchema>;
export type UpdatePerfumeInput = z.infer<typeof updatePerfumeSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type PerfumeNoteInput = z.infer<typeof perfumeNoteInputSchema>;
export type PerfumeImageInput = z.infer<typeof perfumeImageInputSchema>;
export type CreateHouseInput = z.infer<typeof createHouseSchema>;
export type UpdateHouseInput = z.infer<typeof updateHouseSchema>;
export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;
