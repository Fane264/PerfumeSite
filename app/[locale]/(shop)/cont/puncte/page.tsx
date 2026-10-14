import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { LoyaltyView } from "@/components/shop/loyalty/loyalty-view";

export const metadata: Metadata = { title: "Punctele mele" };

export default async function LoyaltyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/cont/puncte");

  const firstName = user.firstName ?? user.email.split("@")[0] ?? "client";

  return <LoyaltyView firstName={firstName} />;
}
