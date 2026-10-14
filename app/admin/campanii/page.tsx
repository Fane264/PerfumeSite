import type { Metadata } from "next";
import { db } from "@/lib/db";
import { serializeCampaign, getSegmentCounts } from "@/lib/campaigns";
import { AdminCampaigns } from "@/components/admin/admin-campaigns";

export const metadata: Metadata = { title: "Admin · Campanii" };
export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const [rows, segmentCounts] = await Promise.all([
    db.emailCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    getSegmentCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Campanii email</h1>
        <span className="text-sm text-muted-foreground">
          {rows.length} campanii
        </span>
      </div>
      <AdminCampaigns
        initialCampaigns={rows.map(serializeCampaign)}
        segmentCounts={segmentCounts}
      />
    </div>
  );
}
