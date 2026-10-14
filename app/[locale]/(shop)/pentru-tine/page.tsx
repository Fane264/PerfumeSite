import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PersonalizedView } from "@/components/shop/personalized-view";

export const metadata: Metadata = { title: "Pentru tine" };

export default async function PersonalizedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/pentru-tine");

  const firstName = user.firstName ?? user.email.split("@")[0] ?? "client";

  return <PersonalizedView firstName={firstName} />;
}
