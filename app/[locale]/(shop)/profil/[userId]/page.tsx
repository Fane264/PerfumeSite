import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { buildScentProfile } from "@/lib/scent-profile";
import { ScentWheel } from "@/components/shop/scent-wheel";
import { APP_URL } from "@/lib/constants";

export const revalidate = 3600;

type RouteContext = { params: { userId: string } };

async function loadPublicProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return null;
  const profile = await buildScentProfile(userId);
  return { firstName: user.firstName, profile };
}

export async function generateMetadata({
  params,
}: RouteContext): Promise<Metadata> {
  const data = await loadPublicProfile(params.userId);
  if (!data || data.profile.needsMoreData) {
    return { title: "Profil olfactiv" };
  }
  const name = data.firstName ?? "Un pasionat de parfumuri";
  return {
    title: `${data.profile.profileType} — profilul olfactiv al lui ${name}`,
    description: data.profile.profileDescription,
    alternates: { canonical: `${APP_URL}/profil/${params.userId}` },
  };
}

export default async function PublicProfilePage({ params }: RouteContext) {
  const data = await loadPublicProfile(params.userId);
  if (!data) notFound();

  const { firstName, profile } = data;
  const name = firstName ?? "Un pasionat de parfumuri";

  if (profile.needsMoreData) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Sparkles className="mx-auto size-10 text-gold" />
        <h1 className="mt-4 font-serif text-3xl text-cream">
          Profil în formare
        </h1>
        <p className="mt-3 text-muted-foreground">
          {name} încă își descoperă semnătura olfactivă.
        </p>
        <Link
          href="/quiz"
          className="mt-6 inline-block border border-gold px-6 py-2.5 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Descoperă-ți profilul olfactiv →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">
        Profil olfactiv
      </p>
      <h1 className="mt-3 font-serif text-4xl text-gold sm:text-5xl">
        {profile.profileType}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">profilul lui {name}</p>
      <p className="mx-auto mt-4 max-w-prose text-muted-foreground">
        {profile.profileDescription}
      </p>

      <div className="my-10">
        <ScentWheel
          segments={profile.topFamilies.map((f) => ({
            name: f.name,
            percentage: f.percentage,
            colorHex: f.colorHex,
          }))}
        />
      </div>

      {profile.topFamilies.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-2">
          {profile.topFamilies.map((f) => (
            <li
              key={f.slug}
              className="rounded-full border border-gold/40 px-4 py-1.5 text-sm text-gold"
            >
              {f.name}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-12 border-t border-border pt-8">
        <p className="text-cream">Care e profilul tău olfactiv?</p>
        <Link
          href="/quiz"
          className="mt-4 inline-block bg-gold px-8 py-3 text-sm font-medium uppercase tracking-wide text-background transition-opacity hover:opacity-90"
        >
          Descoperă-ți profilul olfactiv →
        </Link>
      </div>
    </div>
  );
}
