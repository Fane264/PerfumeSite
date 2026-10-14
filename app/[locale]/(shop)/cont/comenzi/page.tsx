import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serializers";
import { orderArgs } from "@/types";
import { OrderSuccessBanner } from "@/components/shop/account/order-success-banner";
import { OrderHistoryItem } from "@/components/shop/account/order-history-item";

export const metadata: Metadata = { title: "Comenzile mele" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/cont/comenzi");

  const orderRows = await db.order.findMany({
    where: { userId: user.id },
    ...orderArgs,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const orders = orderRows.map((order) => serializeOrder(order));

  return (
    <div className="container py-28 md:py-32">
      <nav className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Link href="/cont" className="hover:text-gold">
          Contul meu
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-cream">Comenzi</span>
      </nav>
      <h1 className="mb-8 font-serif text-4xl font-light text-cream md:text-5xl">
        Comenzile mele
      </h1>

      {searchParams.success === "1" && <OrderSuccessBanner />}

      {orders.length === 0 ? (
        <div className="border border-dashed border-border py-20 text-center">
          <p className="font-serif text-2xl font-light text-cream">
            Nu ai nicio comandă încă
          </p>
          <Link
            href="/parfumuri"
            className="mt-4 inline-block text-sm uppercase tracking-widest text-gold hover:text-gold-light"
          >
            Explorează colecția →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <OrderHistoryItem key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
