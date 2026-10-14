import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { Gift, ShoppingBag, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Folosește cardul cadou | DecantLux",
  description:
    "Cum folosești un card cadou DecantLux: adaugă parfumuri în coș și introdu codul la finalizarea comenzii.",
  alternates: { canonical: "/cadou/redeem" },
};

const STEPS = [
  {
    icon: ShoppingBag,
    title: "Alege parfumurile",
    text: "Explorează colecția și adaugă decanturile dorite în coș.",
  },
  {
    icon: Tag,
    title: "Introdu codul la checkout",
    text: 'În pagina de finalizare a comenzii, deschide secțiunea „Ai un card cadou?" și introdu codul GIFT-XXXX-XXXX.',
  },
  {
    icon: Gift,
    title: "Soldul se aplică automat",
    text: "Valoarea cardului se scade din total. Orice sold rămas poate fi folosit la o comandă viitoare.",
  },
];

export default function RedeemGiftCardPage() {
  return (
    <div className="container py-28 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 flex items-center justify-center gap-2 text-xs uppercase tracking-luxe text-gold">
          <Gift className="size-4" /> Card cadou
        </p>
        <h1 className="font-serif text-4xl font-light text-cream md:text-5xl">
          Folosește cadoul tău
        </h1>
        <p className="mt-4 text-muted-foreground">
          Ai primit un card cadou DecantLux? Iată cum îl folosești în trei pași
          simpli.
        </p>
      </div>

      <ol className="mx-auto mt-14 max-w-2xl space-y-6">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex gap-5 border border-border bg-surface p-6"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold">
              <step.icon className="size-5" />
            </span>
            <div>
              <p className="font-serif text-lg text-cream">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-col items-center gap-4">
        <Link
          href="/parfumuri"
          className="bg-gold px-8 py-3.5 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
        >
          Explorează colecția
        </Link>
        <Link
          href="/cont/carduri-cadou"
          className="text-sm uppercase tracking-widest text-gold hover:text-gold-light"
        >
          Vezi cardurile mele cadou
        </Link>
      </div>
    </div>
  );
}
