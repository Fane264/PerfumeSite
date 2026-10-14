import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { paginationSchema } from "./common";
import { SUPPORTED_CURRENCIES } from "../currency";

// Accepts Romanian mobile/landline formats, with or without +40 / 0040 prefix
// and optional spaces, dots or dashes between groups.
const romanianPhoneRegex =
  /^(?:(?:\+|00)?40|0)\s?[237]\d{1}(?:[\s.-]?\d){7}$/;

export const shippingMethodSchema = z.enum(["standard", "express"]);

export const shippingAddressSchema = z.object({
  name: z.string().trim().min(1, "Numele este obligatoriu"),
  line1: z.string().trim().min(1, "Adresa este obligatorie"),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "Orașul este obligatoriu"),
  county: z.string().trim().min(1, "Județul este obligatoriu"),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Codul poștal trebuie să aibă 6 cifre"),
  country: z.string().min(1).default("România"),
  phone: z
    .string()
    .trim()
    .regex(romanianPhoneRegex, "Număr de telefon invalid (format românesc)"),
});

export const paymentMethodSchema = z.enum(["CARD", "COD"]);

export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

/** POST /api/checkout body. */
export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  shippingMethod: shippingMethodSchema.default("standard"),
  paymentMethod: paymentMethodSchema.default("CARD"),
  currency: currencySchema.default("RON"),
  couponCode: z.string().trim().min(1).optional(),
  giftCardCode: z.string().trim().min(1).optional(),
  giftWrap: z.boolean().optional(),
  giftWrapMessage: z.string().trim().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export const orderStatusSchema = z.nativeEnum(OrderStatus);

/** PATCH /api/admin/orders/[id] body. */
export const updateOrderSchema = z
  .object({
    status: orderStatusSchema.optional(),
    trackingNumber: z.string().min(1).nullable().optional(),
    trackingUrl: z.string().url().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Nu există câmpuri de actualizat",
  });

/** GET /api/admin/orders query. */
export const adminOrdersQuerySchema = z
  .object({
    status: orderStatusSchema.optional(),
    q: z.string().trim().min(1).optional(), // search by customer email/name
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .merge(paginationSchema);

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type AdminOrdersQueryInput = z.infer<typeof adminOrdersQuerySchema>;
