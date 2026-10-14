import type { Metadata } from "next";
import { FlashSaleManager } from "@/components/admin/flash-sale-manager";

export const metadata: Metadata = { title: "Admin · Flash Sales" };

export default function AdminFlashSalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Flash Sales</h1>
        <p className="text-sm text-muted-foreground">
          Creează și gestionează vânzările flash cu reduceri pe timp limitat.
        </p>
      </div>
      <FlashSaleManager />
    </div>
  );
}
