import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Gift, Mail } from "lucide-react";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cadoul a fost trimis | DecantLux",
  robots: { index: false },
};

type SearchParams = { searchParams: { session_id?: string } };

export default async function GiftCardSuccessPage({
  searchParams,
}: SearchParams) {
  const sessionId = searchParams.session_id;
  if (!sessionId) notFound();

  let recipientEmail: string | null = null;
  let recipientName: string | null = null;
  let value = 0;
  let currency = "RON";
  let message: string | null = null;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const giftCardId = session.metadata?.giftCardId;
    if (giftCardId) {
      const card = await db.giftCard.findUnique({ where: { id: giftCardId } });
      if (card) {
        recipientEmail = card.recipientEmail;
        recipientName = card.recipientName;
        value = card.initialValue.toNumber();
        currency = card.currency;
        message = card.personalMessage;
      }
    }
  } catch {
    // Fall through to a generic confirmation if Stripe lookup fails.
  }

  return (
    <div className="container flex flex-col items-center py-32 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Check className="size-8" />
      </div>
      <h1 className="font-serif text-4xl font-light text-cream">
        Cadoul a fost trimis!
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Mulțumim pentru achiziție. Cardul cadou a fost activat și trimis pe
        email.
      </p>

      <div className="mt-10 w-full max-w-md border border-border bg-surface p-6 text-left">
        <div className="flex items-center gap-2 text-gold">
          <Gift className="size-5" />
          <span className="font-serif text-xl">
            {formatPrice(value, currency)}
          </span>
        </div>
        {(recipientName || recipientEmail) && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4 text-gold" />
            Trimis către{" "}
            <span className="text-cream">
              {recipientName ? `${recipientName} · ` : ""}
              {recipientEmail}
            </span>
          </p>
        )}
        {message && (
          <p className="mt-3 border-l-2 border-gold/50 pl-3 text-sm italic text-cream/80">
            „{message}”
          </p>
        )}
      </div>

      <Link
        href="/"
        className="mt-8 border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
      >
        Înapoi acasă
      </Link>
    </div>
  );
}
