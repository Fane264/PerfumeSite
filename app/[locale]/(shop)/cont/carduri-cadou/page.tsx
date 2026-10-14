"use client";

import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Gift, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { giftCardsApi, type MyGiftCard } from "@/lib/api-client";

function statusLabel(card: MyGiftCard): { text: string; className: string } {
  if (!card.isActive)
    return { text: "În așteptare", className: "text-muted-foreground" };
  if (card.isExpired) return { text: "Expirat", className: "text-error" };
  if (card.isDepleted)
    return { text: "Folosit integral", className: "text-muted-foreground" };
  return { text: "Activ", className: "text-success" };
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default function MyGiftCardsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["gift-cards", "my"],
    queryFn: giftCardsApi.my,
    enabled: !!isSignedIn,
  });

  if (isLoaded && !isSignedIn) {
    return (
      <div className="container flex flex-col items-center py-40 text-center">
        <h1 className="font-serif text-3xl font-light text-cream">
          Carduri Cadou
        </h1>
        <p className="mt-3 text-muted-foreground">
          Autentifică-te pentru a vedea cardurile tale cadou.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Autentificare
        </Link>
      </div>
    );
  }

  const cards = data ?? [];

  return (
    <div className="container py-28 md:py-32">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-luxe text-gold">
            <Gift className="size-4" /> Contul meu
          </p>
          <h1 className="font-serif text-4xl font-light text-cream">
            Carduri Cadou
          </h1>
        </div>
        <Link
          href="/cadou"
          className="border border-gold px-5 py-2.5 text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Cumpără un card cadou
        </Link>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-7 animate-spin text-gold" />
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center border border-dashed border-border bg-surface/50 py-20 text-center">
          <Gift className="mb-4 size-8 text-gold" />
          <p className="text-muted-foreground">
            Nu ai încă niciun card cadou cumpărat sau primit.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {cards.map((card) => {
            const status = statusLabel(card);
            const expiry = formatDate(card.expiresAt);
            return (
              <div
                key={card.id}
                className="relative overflow-hidden rounded-2xl border border-gold/30 bg-surface p-6"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gold/10 blur-2xl" />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-gold">
                    {card.relation === "purchased" ? (
                      <>
                        <ArrowUpRight className="size-3.5" /> Cumpărat
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="size-3.5" /> Primit
                      </>
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-xs uppercase tracking-wide",
                      status.className,
                    )}
                  >
                    {status.text}
                  </span>
                </div>

                <p className="mt-6 font-serif text-3xl font-light text-cream">
                  {formatPrice(card.remainingValue, card.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  din {formatPrice(card.initialValue, card.currency)}
                </p>

                <p className="mt-5 font-mono text-sm tracking-[0.25em] text-gold">
                  {card.code}
                </p>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-2">
                  {card.relation === "purchased" && card.recipientEmail && (
                    <span>Pentru: {card.recipientEmail}</span>
                  )}
                  {expiry && <span>Expiră: {expiry}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
