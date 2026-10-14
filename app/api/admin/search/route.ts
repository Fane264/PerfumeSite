import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";

export interface AdminSearchOrder {
  id: string;
  orderNumber: string;
  customerEmail: string;
  total: number;
  currency: string;
  status: string;
}

export interface AdminSearchProduct {
  id: string;
  name: string;
  slug: string;
  houseName: string;
}

export interface AdminSearchUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AdminSearchResults {
  orders: AdminSearchOrder[];
  products: AdminSearchProduct[];
  users: AdminSearchUser[];
}

// GET /api/admin/search?q= — global admin search across orders, products, users.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return apiSuccess<AdminSearchResults>({
        orders: [],
        products: [],
        users: [],
      });
    }

    const [orders, products, users] = await Promise.all([
      db.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          currency: true,
          status: true,
          user: { select: { email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.perfume.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        select: {
          id: true,
          name: true,
          slug: true,
          house: { select: { name: true } },
        },
        take: 5,
      }),
      db.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, email: true, firstName: true, lastName: true },
        take: 5,
      }),
    ]);

    const results: AdminSearchResults = {
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerEmail: o.user.email,
        total: toNumber(o.total),
        currency: o.currency,
        status: o.status,
      })),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        houseName: p.house.name,
      })),
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
      })),
    };

    return apiSuccess(results);
  } catch (error) {
    return handleApiError(error);
  }
}
