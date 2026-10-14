import type { Metadata } from "next";
import { AdminSubscriptionsView } from "@/components/admin/subscriptions-view";

export const metadata: Metadata = { title: "Admin · Abonamente" };

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Abonamente</h1>
        <p className="text-sm text-muted-foreground">
          Abonați activi, venit recurent și cutiile lunii curente.
        </p>
      </div>
      <AdminSubscriptionsView />
    </div>
  );
}
