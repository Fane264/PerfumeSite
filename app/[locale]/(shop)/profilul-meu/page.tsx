"use client";

import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { scentProfileApi, recommendationsApi } from "@/lib/api-client";
import { ScentWheel } from "@/components/shop/scent-wheel";
import { ProductGrid } from "@/components/shop/product-grid";

export default function ProfilulMeuPage() {
  const { user } = useUser();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["scent-profile"],
    queryFn: scentProfileApi.get,
  });
  const { data: recs } = useQuery({
    queryKey: ["recommendations", "personal"],
    queryFn: recommendationsApi.personal,
    enabled: Boolean(profile && !profile.needsMoreData),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-7 animate-spin text-gold" />
      </div>
    );
  }

  if (!profile || profile.needsMoreData) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Sparkles className="mx-auto size-10 text-gold" />
        <h1 className="mt-4 font-serif text-3xl text-cream">
          Profilul tău olfactiv
        </h1>
        <p className="mt-3 text-muted-foreground">
          Avem nevoie de mai multe date pentru a-ți construi profilul
          {profile ? ` (${profile.completeness}% complet)` : ""}. Completează
          quiz-ul olfactiv sau adaugă parfumuri la favorite și comenzi.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/quiz"
            className="border border-gold px-6 py-2.5 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
          >
            Începe quiz-ul
          </Link>
          <Link
            href="/parfumuri"
            className="border border-border px-6 py-2.5 text-sm uppercase tracking-wide text-cream transition-colors hover:border-gold"
          >
            Explorează
          </Link>
        </div>
      </div>
    );
  }

  const recommended =
    recs?.topInYourFamilies.length
      ? recs.topInYourFamilies
      : (recs?.basedOnPurchases ?? []);

  function share() {
    const url = user ? `${window.location.origin}/profil/${user.id}` : "";
    if (url && navigator.share) {
      navigator
        .share({ title: `Sunt ${profile?.profileType}`, url })
        .catch(() => {});
    } else if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copiat!");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* ---- Left: the profile ---- */}
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">
            Profilul tău olfactiv
          </p>
          <h1 className="mt-2 font-serif text-4xl text-gold">
            {profile.profileType}
          </h1>
          <p className="mt-3 max-w-prose text-muted-foreground">
            {profile.profileDescription}
          </p>

          <div className="my-8">
            <ScentWheel
              segments={profile.topFamilies.map((f) => ({
                name: f.name,
                percentage: f.percentage,
                colorHex: f.colorHex,
              }))}
            />
          </div>

          {profile.topNotes.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-serif text-lg text-cream">
                Note semnătură
              </h2>
              <ul className="flex flex-wrap gap-2">
                {profile.topNotes.map((n) => (
                  <li
                    key={n.slug}
                    className="rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-sm text-gold"
                  >
                    {n.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.preferredHouses.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-serif text-lg text-cream">Case favorite</h2>
              <div className="flex flex-wrap gap-3">
                {profile.preferredHouses.map((h) => (
                  <Link
                    key={h.slug}
                    href={`/case/${h.slug}`}
                    className="border border-border bg-surface px-4 py-2 text-sm text-cream transition-colors hover:border-gold"
                  >
                    {h.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {profile.concentrationBreakdown.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-serif text-lg text-cream">
                Concentrație preferată
              </h2>
              <div className="space-y-2">
                {profile.concentrationBreakdown.map((c) => (
                  <div key={c.concentration}>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{c.concentration}</span>
                      <span>{c.percentage}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mt-6 border-t border-border pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Profil complet</span>
              <span className="text-gold">{profile.completeness}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${profile.completeness}%` }}
              />
            </div>
            <button
              type="button"
              onClick={share}
              className="mt-5 inline-flex items-center gap-2 border border-gold px-5 py-2.5 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
            >
              <Share2 className="size-4" />
              Distribuie profilul
            </button>
          </div>
        </div>

        {/* ---- Right: recommendations ---- */}
        <div>
          <h2 className="font-serif text-2xl text-cream">
            Perfect pentru {profile.profileType}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Parfumuri alese pe baza profilului tău olfactiv.
          </p>
          <div className="mt-6">
            {recommended.length > 0 ? (
              <ProductGrid
                perfumes={recommended.slice(0, 6)}
                className="sm:grid-cols-2 lg:grid-cols-2"
              />
            ) : (
              <p className="py-10 text-center text-muted-foreground">
                Se încarcă recomandările…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
