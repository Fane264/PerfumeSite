import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "./constants";

// ----------------------------------------------------------------------------
//  Shipping methods, Romanian counties and delivery-date helpers shared by the
//  checkout UI and (where relevant) the server. Kept framework-agnostic so it
//  can be imported from both client and server components.
// ----------------------------------------------------------------------------

/** Flat surcharge (in RON) for cash-on-delivery (ramburs) orders. */
export const COD_FEE = 8;

export type ShippingMethodId = "standard" | "express";

export interface ShippingMethod {
  id: ShippingMethodId;
  label: string;
  description: string;
  /** Flat fee in RON (before free-shipping rules). */
  fee: number;
  /** Whether the free-shipping threshold can zero out this method's fee. */
  freeEligible: boolean;
  /** Estimated delivery window in business days [min, max]. */
  etaDays: [number, number];
}

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "standard",
    label: "Standard",
    description: "3–5 zile lucrătoare",
    fee: SHIPPING_FEE,
    freeEligible: true,
    etaDays: [3, 5],
  },
  {
    id: "express",
    label: "Express",
    description: "1–2 zile lucrătoare",
    fee: 25,
    freeEligible: false,
    etaDays: [1, 2],
  },
];

export function getShippingMethod(id: ShippingMethodId): ShippingMethod {
  return SHIPPING_METHODS.find((m) => m.id === id) ?? SHIPPING_METHODS[0]!;
}

/**
 * Resolve the effective shipping cost for a method given the order subtotal.
 * Standard becomes free at or above the free-shipping threshold.
 */
export function resolveShippingCost(
  methodId: ShippingMethodId,
  subtotal: number,
): number {
  const method = getShippingMethod(methodId);
  if (method.freeEligible && subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return method.fee;
}

/** Add `businessDays` working days (skipping weekends) to a start date. */
export function addBusinessDays(start: Date, businessDays: number): Date {
  const date = new Date(start);
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return date;
}

/** Human-friendly estimated delivery window, e.g. "18 – 20 iunie". */
export function estimatedDeliveryLabel(
  methodId: ShippingMethodId,
  from: Date = new Date(),
): string {
  const method = getShippingMethod(methodId);
  const min = addBusinessDays(from, method.etaDays[0]);
  const max = addBusinessDays(from, method.etaDays[1]);
  const fmt = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
  });
  if (min.getTime() === max.getTime()) return fmt.format(min);
  return `${fmt.format(min)} – ${fmt.format(max)}`;
}

/** All 41 Romanian counties plus Bucharest, alphabetically. */
export const ROMANIAN_COUNTIES: string[] = [
  "Alba",
  "Arad",
  "Argeș",
  "Bacău",
  "Bihor",
  "Bistrița-Năsăud",
  "Botoșani",
  "Brașov",
  "Brăila",
  "București",
  "Buzău",
  "Caraș-Severin",
  "Călărași",
  "Cluj",
  "Constanța",
  "Covasna",
  "Dâmbovița",
  "Dolj",
  "Galați",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomița",
  "Iași",
  "Ilfov",
  "Maramureș",
  "Mehedinți",
  "Mureș",
  "Neamț",
  "Olt",
  "Prahova",
  "Satu Mare",
  "Sălaj",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timiș",
  "Tulcea",
  "Vaslui",
  "Vâlcea",
  "Vrancea",
];
