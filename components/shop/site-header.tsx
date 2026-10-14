"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SignedIn, SignedOut, SignOutButton } from "@clerk/nextjs";
import {
  Heart,
  ShoppingBag,
  User,
  UserCircle,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  Gift,
  Repeat,
  Users,
  Fingerprint,
  PackageCheck,
  Building2,
  LogOut,
} from "lucide-react";
import { BadgeDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCartStore } from "@/store/cart-store";
import { useTranslations } from "next-intl";
import { LoyaltyBadge } from "@/components/shop/LoyaltyBadge";
import { CurrencyToggle } from "@/components/shop/CurrencyToggle";
import { LanguageSwitcher } from "@/components/shop/LanguageSwitcher";
import { AlgoliaAutocomplete } from "@/components/shop/catalog/AlgoliaAutocomplete";

interface NavLink {
  href: string;
  label: string;
  icon?: typeof Sparkles;
}

// `tKey` indexes the `nav` message namespace so labels localize (RO/EN).
const NAV: { href: string; tKey: string; icon?: typeof Sparkles }[] = [
  { href: "/parfumuri", tKey: "perfumes" },
  { href: "/seturi", tKey: "sets" },
  { href: "/case", tKey: "houses" },
  { href: "/lansari", tKey: "launches" },
  { href: "/blog", tKey: "blog" },
  { href: "/asistent", tKey: "assistant", icon: Sparkles },
];

// Gift dropdown — "Împachetare Premium" now lives as a cart add-on, not here.
// `tKey` indexes the `nav` namespace.
const GIFT_LINKS: { href: string; tKey: string; icon: typeof Sparkles }[] = [
  { href: "/cadou", tKey: "giftCards", icon: Gift },
  { href: "/blog/ghid-cadouri-parfumuri", tKey: "giftGuide", icon: Gift },
];

// Account dropdown — `tKey` indexes the `accountMenu` namespace.
const ACCOUNT_LINKS: { href: string; tKey: string; icon: typeof Sparkles }[] = [
  { href: "/cont", tKey: "myAccount", icon: User },
  { href: "/profilul-meu", tKey: "myProfile", icon: Fingerprint },
  { href: "/cont/puncte", tKey: "myPoints", icon: Sparkles },
  { href: "/pentru-tine", tKey: "forYou", icon: Heart },
  { href: "/cont/precomenzile-mele", tKey: "myPreOrders", icon: PackageCheck },
  { href: "/refer", tKey: "referral", icon: Users },
  { href: "/cont/abonament", tKey: "subscription", icon: Repeat },
  { href: "/cont/afiliat", tKey: "affiliate", icon: BadgeDollarSign },
  { href: "/cont/wholesale", tKey: "wholesale", icon: Building2 },
];

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-background">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function NavDropdown({
  label,
  links,
  defaultIcon,
}: {
  label: string;
  links: NavLink[];
  defaultIcon: typeof Sparkles;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const DefaultIcon = defaultIcon;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 text-sm font-light uppercase tracking-widest text-cream/80 transition-colors hover:text-gold"
      >
        {label}
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 border border-border bg-surface p-2 shadow-2xl"
          >
            {links.map((item) => {
              const Icon = item.icon ?? DefaultIcon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-cream/80 transition-colors hover:bg-surface2 hover:text-gold"
                >
                  <Icon className="size-4 text-gold" />
                  {item.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Consolidated account entry point. Signed-out users get a single link to
 * `/sign-in`; signed-in users get the full account menu in a custom dropdown
 * (replacing both the old text "Cont ▼" nav item and Clerk's UserButton).
 */
function AccountMenu() {
  const ta = useTranslations("accountMenu");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <>
      <SignedOut>
        <Link
          href="/sign-in"
          aria-label={ta("signIn")}
          className="flex size-10 items-center justify-center rounded-full text-cream transition-colors hover:text-gold"
        >
          <UserCircle className="size-5" />
        </Link>
      </SignedOut>

      <SignedIn>
        <div
          ref={ref}
          className="relative"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={ta("myAccount")}
            className="flex size-10 items-center justify-center rounded-full text-cream transition-colors hover:text-gold"
          >
            <UserCircle className="size-5" />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-full z-50 mt-2 w-56 border border-border bg-surface p-2 shadow-2xl"
              >
                {ACCOUNT_LINKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-cream/80 transition-colors hover:bg-surface2 hover:text-gold"
                    >
                      <Icon className="size-4 text-gold" />
                      {ta(item.tKey)}
                    </Link>
                  );
                })}
                <div className="my-1.5 h-px bg-border" />
                <SignOutButton redirectUrl="/">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-cream/80 transition-colors hover:bg-surface2 hover:text-gold"
                  >
                    <LogOut className="size-4 text-gold" />
                    {ta("signOut")}
                  </button>
                </SignOutButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SignedIn>
    </>
  );
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const ta = useTranslations("accountMenu");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const openCart = useCartStore((s) => s.open);
  const { cart } = useCart();
  const { entries } = useWishlist();

  const giftLinks: NavLink[] = GIFT_LINKS.map((l) => ({
    href: l.href,
    label: t(l.tKey),
    icon: l.icon,
  }));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 backdrop-blur-md transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/85"
          : "border-b border-transparent bg-background/40",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 md:h-20">
        <Link
          href="/"
          className="font-serif text-2xl font-light tracking-widest text-gold"
        >
          DÉCANT
        </Link>

        <nav className="hidden items-center gap-7 md:flex lg:gap-9">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 text-sm font-light uppercase tracking-widest text-cream/80 transition-colors hover:text-gold"
            >
              {item.icon && <item.icon className="size-3.5 text-gold" />}
              {t(item.tKey)}
            </Link>
          ))}
          <Link
            href="/abonament"
            className="flex items-center gap-1.5 border border-gold/50 px-3 py-1.5 text-sm font-light uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
          >
            <Repeat className="size-3.5" />
            {t("subscription")}
          </Link>
          <NavDropdown label={t("gifts")} links={giftLinks} defaultIcon={Gift} />
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcher className="mr-1 hidden sm:flex" />
          <CurrencyToggle className="mr-1 hidden sm:inline-flex" />
          <AlgoliaAutocomplete iconClassName="hidden sm:flex" />
          <Link
            href="/cont?tab=favorite"
            aria-label="Favorite"
            className="relative hidden size-10 items-center justify-center rounded-full text-cream transition-colors hover:text-gold sm:flex"
          >
            <Heart className="size-5" />
            <CountBadge count={entries.length} />
          </Link>
          <button
            type="button"
            onClick={openCart}
            aria-label="Deschide coșul"
            className="relative flex size-10 items-center justify-center rounded-full text-cream transition-colors hover:text-gold"
          >
            <ShoppingBag className="size-5" />
            <CountBadge count={cart.itemCount} />
          </button>

          <SignedIn>
            <LoyaltyBadge className="ml-1" />
          </SignedIn>

          <AccountMenu />

          <AlgoliaAutocomplete iconClassName="sm:hidden" />

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Meniu navigare"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="flex size-10 items-center justify-center rounded-full text-cream transition-colors hover:text-gold md:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {/* Mobile full-screen overlay menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Meniu navigare"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background md:hidden"
          >
            <div className="container flex h-16 items-center justify-between">
              <span className="font-serif text-2xl font-light tracking-widest text-gold">
                DÉCANT
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Închide meniul"
                className="flex size-10 items-center justify-center text-cream"
              >
                <X className="size-6" />
              </button>
            </div>
            <motion.nav
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="container mt-8 flex flex-col gap-6 pb-12"
            >
              {NAV.map((item) => (
                <motion.div key={item.href} variants={fadeUp}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 font-serif text-3xl font-light text-cream transition-colors hover:text-gold"
                  >
                    {item.icon && <item.icon className="size-6 text-gold" />}
                    {t(item.tKey)}
                  </Link>
                </motion.div>
              ))}

              <motion.div variants={fadeUp}>
                <Link
                  href="/abonament"
                  className="flex items-center gap-2 font-serif text-3xl font-light text-gold transition-colors hover:text-gold-light"
                >
                  <Repeat className="size-6" />
                  {t("subscription")}
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-2">
                <p className="mb-3 text-xs uppercase tracking-luxe text-gold">
                  {t("gifts")}
                </p>
                <div className="flex flex-col gap-3">
                  {giftLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 text-lg text-cream/80 transition-colors hover:text-gold"
                    >
                      <Gift className="size-4 text-gold" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-4">
                <p className="mb-3 text-xs uppercase tracking-luxe text-gold">
                  {t("account")}
                </p>
                <div className="flex flex-col gap-3">
                  {ACCOUNT_LINKS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2 text-lg text-cream/80 transition-colors hover:text-gold"
                      >
                        <Icon className="size-4 text-gold" />
                        {ta(item.tKey)}
                      </Link>
                    );
                  })}
                  <SignedIn>
                    <SignOutButton redirectUrl="/">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-lg text-cream/80 transition-colors hover:text-gold"
                      >
                        <LogOut className="size-4 text-gold" />
                        {ta("signOut")}
                      </button>
                    </SignOutButton>
                  </SignedIn>
                  <SignedOut>
                    <Link
                      href="/sign-in"
                      className="flex items-center gap-2 text-lg text-cream/80 transition-colors hover:text-gold"
                    >
                      <UserCircle className="size-4 text-gold" />
                      {ta("signIn")}
                    </Link>
                  </SignedOut>
                </div>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
