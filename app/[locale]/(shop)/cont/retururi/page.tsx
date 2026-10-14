import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ReturnsView } from "@/components/shop/account/returns-view";

export const metadata: Metadata = { title: "Retururile mele" };

export default async function ReturnsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/cont/retururi");

  return (
    <Suspense>
      <ReturnsView />
    </Suspense>
  );
}
