import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serializers";
import { orderArgs } from "@/types";
import { cn, formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from "@/lib/order-status";
import { AnalyticsDashboard } from "@/components/admin/analytics/analytics-dashboard";

export const metadata: Metadata = { title: "Admin · Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const recentRows = await db.order.findMany({
    ...orderArgs,
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const recentOrders = recentRows.map((o) =>
    serializeOrder(o, { includeCustomer: true }),
  );

  return (
    <div className="space-y-8">
      <AnalyticsDashboard />

      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-medium">Comenzi recente</h2>
          <Link
            href="/admin/comenzi"
            className="text-sm text-gold-dark hover:underline"
          >
            Vezi toate →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Nicio comandă încă.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="p-3 font-medium">Comandă</th>
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Data</th>
                <th className="p-3 font-medium">Total</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">#{order.orderNumber}</td>
                  <td className="p-3 text-muted-foreground">
                    {order.customer?.name ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("ro-RO")}
                  </td>
                  <td className="p-3">
                    {formatPrice(order.total, order.currency)}
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "rounded-sm border px-2 py-0.5 text-[11px] uppercase tracking-wide",
                        ORDER_STATUS_CLASS[order.status],
                      )}
                    >
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
