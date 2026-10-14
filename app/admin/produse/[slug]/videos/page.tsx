import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { VideoManager } from "@/components/admin/video-manager";

export const metadata: Metadata = { title: "Admin · Videoclipuri produs" };
export const dynamic = "force-dynamic";

type RouteContext = { params: { slug: string } };

export default async function AdminProductVideosPage({ params }: RouteContext) {
  const perfume = await db.perfume.findUnique({
    where: { slug: params.slug },
    select: { name: true, house: { select: { name: true } } },
  });
  if (!perfume) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/produse"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Produse
        </Link>
        <h1 className="mt-2 font-serif text-3xl">{perfume.name}</h1>
        <p className="text-sm text-muted-foreground">
          {perfume.house.name} · Videoclipuri
        </p>
      </div>
      <VideoManager slug={params.slug} />
    </div>
  );
}
