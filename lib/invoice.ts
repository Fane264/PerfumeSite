import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { db } from "./db";
import { env } from "./env";
import { toNumber } from "./utils";
import {
  InvoiceDocument,
  type InvoiceData,
  type InvoiceLine,
} from "@/components/pdf/InvoiceDocument";
import type { ShippingAddress } from "@/types";

// ----------------------------------------------------------------------------
//  Server-only PDF invoice generation (Phase 7). Fetches an order and renders
//  the React-PDF document to a Buffer. Romanian retail prices are VAT-inclusive
//  (gross), so VAT is extracted from the totals at the standard 19% rate.
// ----------------------------------------------------------------------------

const VAT_RATE = 0.19;

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);

/** Company details from env, with safe placeholders when unconfigured. */
function companyDetails() {
  return {
    name: env.COMPANY_NAME ?? "DecantLux SRL",
    cui: env.COMPANY_CUI ?? "RO00000000",
    address: env.COMPANY_ADDRESS ?? "Str. Exemplu nr. 1, București, România",
    iban: env.COMPANY_IBAN ?? "RO00 BANK 0000 0000 0000 0000",
    bank: env.COMPANY_BANK ?? "Bancă",
    email: env.EMAIL_REPLY_TO ?? env.ADMIN_EMAIL ?? "suport@decantlux.ro",
  };
}

/** Build the invoice DTO for an order (or `null` if the order doesn't exist). */
export async function buildInvoiceData(
  orderId: string,
): Promise<InvoiceData | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  if (!order) return null;

  const currency = order.currency || "RON";
  const vatOf = (gross: number) =>
    Math.round((gross - gross / (1 + VAT_RATE)) * 100) / 100;

  const lines: InvoiceLine[] = order.items.map((item) => {
    const unitPrice = toNumber(item.priceAtPurchase);
    const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
    return {
      name: `${item.perfumeNameAtPurchase} — ${toNumber(item.sizeMLAtPurchase)} ml`,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      vat: vatOf(lineTotal),
    };
  });

  const address = order.shippingAddress as unknown as ShippingAddress;
  const customerName =
    `${order.user.firstName ?? ""} ${order.user.lastName ?? ""}`.trim() ||
    address?.name ||
    "Client";

  const issue = order.paidAt ?? order.createdAt;
  const due = new Date(issue);
  due.setDate(due.getDate() + 14);

  const total = toNumber(order.total);
  const year = issue.getFullYear();
  const orderRef = order.orderNumber.replace(/[^a-z0-9]/gi, "");

  return {
    invoiceNumber: `FACT-${year}-${orderRef}`,
    issueDate: fmtDate(issue),
    dueDate: fmtDate(due),
    currency,
    company: companyDetails(),
    customer: {
      name: customerName,
      email: order.user.email,
      address: address
        ? [
            address.line1,
            address.line2,
            `${address.postalCode} ${address.city}, ${address.county}`,
            address.country,
          ]
            .filter(Boolean)
            .join(", ")
        : "—",
    },
    lines,
    subtotalGross: toNumber(order.subtotal),
    shipping: toNumber(order.shippingCost),
    discount: toNumber(order.discount),
    vatTotal: vatOf(total),
    total,
  };
}

/** Render an order's invoice PDF to a Buffer. Throws if the order is missing. */
export async function generateInvoicePDF(orderId: string): Promise<Buffer> {
  const data = await buildInvoiceData(orderId);
  if (!data) {
    throw new Error(`Comanda ${orderId} nu a fost găsită`);
  }
  const element = createElement(InvoiceDocument, { data }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(element);
}
