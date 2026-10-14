import type { Metadata } from "next";
import { Percent, FileText, UserCog, Headphones } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/constants";
import { WholesaleApplyForm } from "@/components/shop/wholesale-apply-form";

export const metadata: Metadata = {
  title: "Wholesale B2B — Devino partener DecantLux",
  description:
    "Program wholesale pentru parfumerii și boutique-uri: discount 20%+, facturare B2B, cont dedicat și suport prioritar.",
  alternates: {
    canonical: `${APP_URL}/wholesale`,
    languages: { ro: `${APP_URL}/wholesale`, en: `${APP_URL}/en/wholesale` },
  },
};

const BENEFITS = [
  { icon: Percent, title: "Discount 20%+", text: "Prețuri preferențiale pe tot catalogul de decanturi." },
  { icon: FileText, title: "Factură B2B", text: "Facturare cu CUI și TVA pentru contabilitate." },
  { icon: UserCog, title: "Cont dedicat", text: "Prețuri wholesale aplicate automat la checkout." },
  { icon: Headphones, title: "Suport prioritar", text: "Account manager dedicat pentru comenzile tale." },
];

// Illustrative pricing rows (retail vs. 20% wholesale on a 20-unit order).
const PRICING = [
  { size: "5 ml × 20 buc", retail: 1800, wholesale: 1440 },
  { size: "10 ml × 20 buc", retail: 3200, wholesale: 2560 },
  { size: "30 ml × 20 buc", retail: 7600, wholesale: 6080 },
];

export default async function WholesalePage() {
  const t = await getTranslations("wholesale");
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">B2B</p>
        <h1 className="mt-3 font-serif text-4xl text-cream sm:text-5xl">
          {t("pageTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          {t("pageSubtitle")}
        </p>
      </header>

      <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <div key={b.title} className="border border-border bg-surface p-5">
            <b.icon className="size-6 text-gold" />
            <h3 className="mt-3 font-medium text-cream">{b.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
          </div>
        ))}
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="font-serif text-2xl text-cream">Prețuri exemplu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estimări pentru o comandă de 20 de unități, discount wholesale 20%.
          </p>
          <table className="mt-4 w-full border border-border text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-3 font-medium">Pachet</th>
                <th className="p-3 text-right font-medium">Retail</th>
                <th className="p-3 text-right font-medium">Wholesale</th>
              </tr>
            </thead>
            <tbody>
              {PRICING.map((p) => (
                <tr key={p.size} className="border-b border-border last:border-0">
                  <td className="p-3 text-cream">{p.size}</td>
                  <td className="p-3 text-right text-muted-foreground line-through">
                    {p.retail.toLocaleString("ro-RO")} RON
                  </td>
                  <td className="p-3 text-right font-medium text-gold">
                    {p.wholesale.toLocaleString("ro-RO")} RON
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-4 font-serif text-2xl text-cream">Aplică acum</h2>
          <WholesaleApplyForm />
        </section>
      </div>
    </div>
  );
}
