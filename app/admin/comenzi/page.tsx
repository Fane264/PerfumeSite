import type { Metadata } from "next";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serializers";
import { orderArgs } from "@/types";
import { AdminOrdersTable } from "@/components/admin/admin-orders-table";
import { ExportButton } from "@/components/admin/ExportButton";

export const metadata: Metadata = { title: "Admin · Comenzi" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orderRows = await db.order.findMany({
    ...orderArgs,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const orders = orderRows.map((order) =>
    serializeOrder(order, { includeCustomer: true }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Comenzi</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {orders.length} comenzi
          </span>
          <ExportButton />
        </div>
      </div>
      <AdminOrdersTable initialOrders={orders} />
    </div>
  );
}
