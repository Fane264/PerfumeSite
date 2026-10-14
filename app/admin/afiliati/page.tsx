import type { Metadata } from "next";
import { db } from "@/lib/db";
import { serializeAdminAffiliate } from "@/lib/affiliate";
import { AdminAffiliates } from "@/components/admin/admin-affiliates";

export const metadata: Metadata = { title: "Admin · Afiliați" };
export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
  const accounts = await db.affiliateAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      _count: { select: { conversions: true } },
    },
  });
  const rows = accounts.map(serializeAdminAffiliate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Afiliați</h1>
        <span className="text-sm text-muted-foreground">
          {rows.length} afiliați
        </span>
      </div>
      <AdminAffiliates initial={rows} />
    </div>
  );
}
