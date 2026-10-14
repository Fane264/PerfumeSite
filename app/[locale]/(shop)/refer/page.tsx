import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ReferralView } from "@/components/shop/refer/referral-view";

export const metadata: Metadata = {
  title: "Invită prietenii",
  description:
    "Invită prietenii pe DÉCANT și câștigați amândoi puncte de loialitate.",
};

export default async function ReferPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/refer");

  return <ReferralView />;
}
