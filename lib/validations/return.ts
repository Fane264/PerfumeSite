import { z } from "zod";
import { ReturnReason, ReturnStatus } from "@prisma/client";
import { idSchema } from "./common";

/** POST /api/returns body — initiate a return request. */
export const createReturnSchema = z.object({
  orderId: idSchema,
  reason: z.nativeEnum(ReturnReason),
  description: z.string().max(2000).optional(),
  items: z
    .array(
      z.object({
        orderItemId: idSchema,
        quantity: z.number().int().min(1, "Cantitate minimă 1"),
      }),
    )
    .min(1, "Selectează cel puțin un produs"),
});

/** PATCH /api/admin/returns/[id] body — admin transitions a return. */
export const updateReturnSchema = z
  .object({
    status: z.nativeEnum(ReturnStatus).optional(),
    adminNotes: z.string().max(2000).optional(),
    refundAmount: z.number().nonnegative().optional(),
    refundMethod: z.enum(["card", "voucher"]).optional(),
    trackingNumber: z.string().max(120).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Niciun câmp de actualizat",
  });

/** GET /api/admin/returns query filters. */
export const adminReturnQuerySchema = z.object({
  status: z.nativeEnum(ReturnStatus).optional(),
  q: z.string().trim().max(120).optional(),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type UpdateReturnInput = z.infer<typeof updateReturnSchema>;
