import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BoxCurationView } from "@/components/admin/box-curation-view";

export const metadata: Metadata = { title: "Admin · Curare cutii" };
export const dynamic = "force-dynamic";

export default function BoxCurationPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/abonamente"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Abonamente
        </Link>
        <h1 className="mt-2 font-serif text-3xl">Curare cutii lunare</h1>
        <p className="text-sm text-muted-foreground">
          Alege parfumurile incluse în cutia de abonament pentru fiecare lună.
        </p>
      </div>
      <BoxCurationView />
    </div>
  );
}
