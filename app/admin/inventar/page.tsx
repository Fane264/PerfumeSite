import type { Metadata } from "next";
import { InventoryForecastView } from "@/components/admin/inventory-forecast-view";

export const metadata: Metadata = { title: "Admin · Inventar" };

export default function AdminInventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Prognoză inventar</h1>
        <p className="text-sm text-muted-foreground">
          Proiecție de epuizare a stocului și recomandări de reaprovizionare pe
          baza vânzărilor din ultimele 30 de zile.
        </p>
      </div>
      <InventoryForecastView />
    </div>
  );
}
