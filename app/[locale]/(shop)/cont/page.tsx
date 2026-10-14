import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { AccountView } from "@/components/shop/account/account-view";

export const metadata: Metadata = { title: "Contul meu" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/cont");

  const name =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  return (
    <Suspense>
      <AccountView
        user={{
          id: user.id,
          name,
          email: user.email,
          isAdmin: user.role === "ADMIN",
        }}
      />
    </Suspense>
  );
}
