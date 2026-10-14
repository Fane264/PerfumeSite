import type { Metadata } from "next";
import { db } from "@/lib/db";
import { returnInclude, serializeReturn } from "@/lib/returns";
import { AdminReturns } from "@/components/admin/admin-returns";

export const metadata: Metadata = { title: "Admin · Retururi" };
export const dynamic = "force-dynamic";

export default async function AdminReturnsPage() {
  const rows = await db.returnRequest.findMany({
    include: returnInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const returns = rows.map(serializeReturn);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Retururi</h1>
        <span className="text-sm text-muted-foreground">
          {returns.length} cereri
        </span>
      </div>
      <AdminReturns initialReturns={returns} />
    </div>
  );
}
