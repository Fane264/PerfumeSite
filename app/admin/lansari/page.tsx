import type { Metadata } from "next";
import { LaunchesManager } from "@/components/admin/launches-manager";

export const metadata: Metadata = { title: "Admin · Lansări" };
export const dynamic = "force-dynamic";

export default function AdminLansariPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Lansări &amp; Precomenzi</h1>
        <p className="text-sm text-muted-foreground">
          Gestionează waitlist-ul și precomenzile pentru parfumurile în curând
          disponibile.
        </p>
      </div>
      <LaunchesManager />
    </div>
  );
}
