import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { orderArgs } from "@/types";
import { serializeOrder } from "@/lib/serializers";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

export const runtime = "nodejs";

const CSV_HEADERS = [
  "ID",
  "Data",
  "Client",
  "Email",
  "Telefon",
  "Produse",
  "Subtotal",
  "Transport",
  "Discount",
  "Total",
  "Status",
  "Tracking",
  "Adresa",
];

/** Quote a single CSV cell, escaping embedded quotes. */
function csvCell(value: string | number): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

// GET /api/admin/orders/export?status=&from=&to= — CSV of orders. Admin only.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const sp = req.nextUrl.searchParams;
    const statusParam = sp.get("status");
    const fromParam = sp.get("from");
    const toParam = sp.get("to");

    const where: Prisma.OrderWhereInput = {};
    if (statusParam && statusParam in OrderStatus) {
      where.status = statusParam as OrderStatus;
    }
    const createdAt: Prisma.DateTimeFilter = {};
    if (fromParam) {
      const from = new Date(fromParam);
      if (isValidDate(from)) createdAt.gte = from;
    }
    if (toParam) {
      const to = new Date(toParam);
      if (isValidDate(to)) {
        // Make the "to" date inclusive of the whole day.
        to.setHours(23, 59, 59, 999);
        createdAt.lte = to;
      }
    }
    if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

    const rows = await db.order.findMany({
      where,
      ...orderArgs,
      orderBy: { createdAt: "desc" },
    });
    const orders = rows.map((o) => serializeOrder(o, { includeCustomer: true }));

    const lines = [CSV_HEADERS.map(csvCell).join(",")];
    for (const order of orders) {
      const products = order.items
        .map(
          (item) => `${item.perfumeName} ${item.sizeML}ml x${item.quantity}`,
        )
        .join(", ");
      const addr = order.shippingAddress;
      const addressStr = [
        addr.line1,
        addr.line2,
        `${addr.postalCode} ${addr.city}`,
        addr.county,
        addr.country,
      ]
        .filter(Boolean)
        .join(", ");

      lines.push(
        [
          csvCell(order.orderNumber),
          csvCell(new Date(order.createdAt).toLocaleString("ro-RO")),
          csvCell(order.customer?.name ?? ""),
          csvCell(order.customer?.email ?? ""),
          csvCell(addr.phone ?? ""),
          csvCell(products),
          csvCell(order.subtotal.toFixed(2)),
          csvCell(order.shippingCost.toFixed(2)),
          csvCell(order.discount.toFixed(2)),
          csvCell(order.total.toFixed(2)),
          csvCell(ORDER_STATUS_LABEL[order.status]),
          csvCell(order.trackingNumber ?? ""),
          csvCell(addressStr),
        ].join(","),
      );
    }

    // Prepend a UTF-8 BOM so Excel renders Romanian diacritics correctly.
    const csv = "﻿" + lines.join("\r\n");
    const fromLabel = fromParam?.slice(0, 10) ?? "inceput";
    const toLabel = toParam?.slice(0, 10) ?? "azi";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="comenzi-${fromLabel}-${toLabel}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
