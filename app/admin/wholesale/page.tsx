import type { Metadata } from "next";
import { WholesaleManager } from "@/components/admin/wholesale-manager";

export const metadata: Metadata = { title: "Admin · Wholesale" };
export const dynamic = "force-dynamic";

export default function AdminWholesalePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Wholesale B2B</h1>
        <p className="text-sm text-muted-foreground">
          Aprobă cereri, ajustează rata de discount și monitorizează conturile
          partenere.
        </p>
      </div>
      <WholesaleManager />
    </div>
  );
}
