import { z } from "zod";

/** Preset gift card denominations (RON) shown on the purchase page. */
export const GIFT_CARD_VALUES = [50, 100, 150, 200, 300] as const;

/** Bounds for custom gift card amounts. */
export const GIFT_CARD_MIN = 25;
export const GIFT_CARD_MAX = 1000;

/** POST /api/gift-cards/purchase body. */
export const giftCardPurchaseSchema = z.object({
  value: z
    .number()
    .min(GIFT_CARD_MIN, `Valoare minimă ${GIFT_CARD_MIN} RON`)
    .max(GIFT_CARD_MAX, `Valoare maximă ${GIFT_CARD_MAX} RON`),
  recipientEmail: z.string().trim().email("Adresă de email invalidă"),
  recipientName: z.string().trim().min(1, "Numele este obligatoriu").max(80),
  personalMessage: z.string().trim().max(200).optional(),
});

/** POST /api/gift-cards/validate body. */
export const giftCardValidateSchema = z.object({
  code: z.string().trim().min(1, "Codul este obligatoriu"),
  cartSubtotal: z.number().nonnegative().default(0),
});

/** POST /api/gift-cards/redeem body (internal). */
export const giftCardRedeemSchema = z.object({
  code: z.string().trim().min(1),
  orderId: z.string().min(1),
  amount: z.number().positive(),
});

export type GiftCardPurchaseInput = z.infer<typeof giftCardPurchaseSchema>;
export type GiftCardValidateInput = z.infer<typeof giftCardValidateSchema>;
