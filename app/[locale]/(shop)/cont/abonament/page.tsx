import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SubscriptionManageView } from "@/components/shop/subscription/subscription-manage-view";

export const metadata: Metadata = { title: "Abonamentul meu" };

export default async function ManageSubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/cont/abonament");

  const [families, notes] = await Promise.all([
    db.olfactoryFamily.findMany({ orderBy: { name: "asc" } }),
    db.olfactoryNote.findMany({ orderBy: { name: "asc" }, take: 60 }),
  ]);

  return (
    <SubscriptionManageView
      families={families.map((f) => ({ slug: f.slug, name: f.name }))}
      notes={notes.map((n) => ({ slug: n.slug, name: n.name }))}
    />
  );
}
