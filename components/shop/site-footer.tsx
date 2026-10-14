import { Link } from "@/i18n/navigation";
import { Instagram, Facebook, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { NewsletterForm } from "@/components/shop/newsletter-form";

const SHOP_LINKS = [
  { href: "/parfumuri", tKey: "allPerfumes" },
  { href: "/parfumuri?sort=newest", tKey: "newArrivals" },
  { href: "/lansari", tKey: "upcomingLaunches" },
  { href: "/parfumuri?available=true", tKey: "inStock" },
  { href: "/quiz", tKey: "olfactoryQuiz" },
  { href: "/afiliat", tKey: "affiliateProgram" },
  { href: "/wholesale", tKey: "wholesaleB2b" },
];

const LEGAL_LINKS = [
  { href: "/legal/politica-confidentialitate", tKey: "privacyPolicy" },
  { href: "/legal/termeni-si-conditii", tKey: "termsConditions" },
  { href: "/legal/politica-retur", tKey: "returnPolicy" },
  { href: "/legal/anpc", tKey: "anpc" },
];

const HOUSES = [
  { href: "/case/creed", label: "Creed" },
  { href: "/case/xerjoff", label: "Xerjoff" },
  { href: "/case/amouage", label: "Amouage" },
  { href: "/case/initio", label: "Initio" },
];

export function SiteFooter() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="font-serif text-2xl font-light tracking-widest text-gold">
            DÉCANT
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t("brandDesc")}
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-sm border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs uppercase tracking-wide text-gold">
            <ShieldCheck className="size-4" /> {t("authenticity")}
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-cream">
            {t("shop")}
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {SHOP_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-gold">
                  {t(l.tKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-cream">
            {t("partnerHouses")}
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {HOUSES.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-cream">
            {t("legalInfo")}
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-gold">
                  {t(l.tKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-cream">
            {t("newsletter")}
          </h4>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("newsletterDesc")}
          </p>
          <NewsletterForm />
          <div className="mt-6 flex items-center gap-3">
            <a
              href="https://instagram.com"
              aria-label="Instagram"
              className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-gold hover:text-gold"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="https://facebook.com"
              aria-label="Facebook"
              className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-gold hover:text-gold"
            >
              <Facebook className="size-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} DÉCANT. {t("rightsReserved")}
          </p>
          <p>{t("tagline")}</p>
        </div>
      </div>
    </footer>
  );
}
