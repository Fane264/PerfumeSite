"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import {
  Home,
  FlaskConical,
  Package,
  Repeat,
  ShoppingBag,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useCartStore } from "@/store/cart-store";

interface Item {
  label: string;
  href?: string;
  icon: typeof Home;
  match?: (path: string) => boolean;
  action?: "cart";
}

const ITEMS: Item[] = [
  { label: "Acasă", href: "/", icon: Home, match: (p) => p === "/" },
  {
    label: "Parfumuri",
    href: "/parfumuri",
    icon: FlaskConical,
    match: (p) => p.startsWith("/parfumuri") || p.startsWith("/case"),
  },
  {
    label: "Seturi",
    href: "/seturi",
    icon: Package,
    match: (p) => p.startsWith("/seturi"),
  },
  {
    label: "Abonament",
    href: "/abonament",
    icon: Repeat,
    match: (p) => p === "/abonament",
  },
  { label: "Coș", icon: ShoppingBag, action: "cart" },
  {
    label: "Cont",
    href: "/cont",
    icon: User,
    match: (p) => p.startsWith("/cont"),
  },
];

/** Fixed bottom navigation for mobile (hidden from `sm` up). */
export function MobileNav() {
  const pathname = usePathname();
  const openCart = useCartStore((s) => s.open);
  const { cart } = useCart();

  return (
    <nav
      aria-label="Navigare mobilă"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md sm:hidden"
    >
      <ul className="flex items-stretch">
        {ITEMS.map((item) => {
          const active = item.match ? item.match(pathname) : false;
          const content = (
            <>
              <span className="relative">
                <item.icon
                  className={cn(
                    "size-5 transition-colors",
                    active ? "text-gold" : "text-cream/70",
                  )}
                />
                {item.action === "cart" && cart.itemCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-semibold text-background">
                    {cart.itemCount > 9 ? "9+" : cart.itemCount}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wide",
                  active ? "text-gold" : "text-cream/60",
                )}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute -bottom-px h-0.5 w-6 rounded-full bg-gold" />
              )}
            </>
          );

          return (
            <li key={item.label} className="flex-1">
              {item.action === "cart" ? (
                <button
                  type="button"
                  onClick={openCart}
                  aria-label="Deschide coșul"
                  className="relative flex w-full flex-col items-center justify-center gap-1 py-2.5"
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={item.href!}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="relative flex w-full flex-col items-center justify-center gap-1 py-2.5"
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {/* Safe-area inset for iOS home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
