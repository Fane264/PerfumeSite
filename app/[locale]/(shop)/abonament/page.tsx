import type { Metadata } from "next";
import { db } from "@/lib/db";
import { serializeSubscriptionPlan } from "@/lib/subscriptions";
import { SubscriptionLanding } from "@/components/shop/subscription/subscription-landing";

export const metadata: Metadata = {
  title: "Abonament — Discovery Box lunar",
  description:
    "Descoperă în fiecare lună decanturi noi selectate de experți. Abonament lunar de parfumuri de nișă.",
  alternates: { canonical: "/abonament" },
};

export const revalidate = 300;

export default async function SubscriptionPage() {
  const [planRows, families, notes] = await Promise.all([
    db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    }),
    db.olfactoryFamily.findMany({ orderBy: { name: "asc" } }),
    db.olfactoryNote.findMany({ orderBy: { name: "asc" }, take: 60 }),
  ]);

  return (
    <SubscriptionLanding
      plans={planRows.map(serializeSubscriptionPlan)}
      families={families.map((f) => ({ slug: f.slug, name: f.name }))}
      notes={notes.map((n) => ({ slug: n.slug, name: n.name }))}
    />
  );
}
