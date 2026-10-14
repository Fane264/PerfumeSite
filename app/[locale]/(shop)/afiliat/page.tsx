import type { Metadata } from "next";
import { AffiliateLanding } from "@/components/shop/affiliate/affiliate-landing";

export const metadata: Metadata = {
  title: "Program afiliat — câștigă din parfumuri de nișă",
  description:
    "Recomandă decanturi DecantLux audienței tale și câștigă 10% comision din fiecare vânzare. Program afiliat pentru influenceri și pasionați de parfumuri.",
};

export default function AfiliatPage() {
  return <AffiliateLanding />;
}
