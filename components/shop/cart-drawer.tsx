"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, X, Loader2, Package } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatFromRon } from "@/lib/currency";
import { useCurrencyStore } from "@/store/currency-store";
import { drawerTransition } from "@/lib/motion";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { useCartStore } from "@/store/cart-store";
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
} from "@/hooks/use-cart";
import type { ApiCartItem } from "@/types";

type CartGroup =
  | { type: "bundle"; key: string; name: string; items: ApiCartItem[] }
  | { type: "single"; key: string; item: ApiCartItem };

/** Group consecutive bundle lines under one header; singles pass through. */
function groupCartItems(items: ApiCartItem[]): CartGroup[] {
  const groups: CartGroup[] = [];
  const bundleIndex = new Map<string, number>();

  for (const item of items) {
    if (item.bundleId) {
      const existing = bundleIndex.get(item.bundleId);
      if (existing !== undefined) {
        (groups[existing] as Extract<CartGroup, { type: "bundle" }>).items.push(item);
        continue;
      }
      bundleIndex.set(item.bundleId, groups.length);
      groups.push({
        type: "bundle",
        key: `bundle-${item.bundleId}`,
        name: item.bundleName ?? "Set",
        items: [item],
      });
    } else {
      groups.push({ type: "single", key: item.id, item });
    }
  }
  return groups;
}

function LineItem({ item }: { item: ApiCartItem }) {
  const t = useTranslations("cart");
  const currency = useCurrencyStore((s) => s.currency);
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const { variant } = item;
  const { perfume } = variant;
  const busy = update.isPending || remove.isPending;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex gap-4 py-4"
    >
      <Link
        href={`/parfumuri/${perfume.slug}`}
        className="relative size-16 shrink-0 overflow-hidden bg-surface2"
      >
        {perfume.primaryImage && (
          <Image
            src={perfume.primaryImage.url}
            alt={perfume.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-gold">
              {perfume.house.name}
            </p>
            <Link
              href={`/parfumuri/${perfume.slug}`}
              className="block truncate font-serif text-base text-cream"
            >
              {perfume.name}
            </Link>
            <p className="text-xs text-muted-foreground">{variant.sizeML} ml</p>
          </div>
          <button
            type="button"
            onClick={() => remove.mutate(item.id)}
            disabled={busy}
            aria-label={t("remove")}
            className="text-muted-foreground transition-colors hover:text-error"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center border border-border">
            <button
              type="button"
              aria-label={t("decrease")}
              disabled={busy}
              onClick={() =>
                update.mutate({ cartItemId: item.id, quantity: item.quantity - 1 })
              }
              className="flex size-7 items-center justify-center text-cream transition-colors hover:text-gold disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-8 text-center text-sm tabular-nums text-cream">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={t("increase")}
              disabled={busy}
              onClick={() =>
                update.mutate({ cartItemId: item.id, quantity: item.quantity + 1 })
              }
              className="flex size-7 items-center justify-center text-cream transition-colors hover:text-gold disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <span className="text-sm text-cream">
            {formatFromRon(item.lineTotal, currency)}
          </span>
        </div>

        {variant.isLowStock && (
          <p className="mt-1 text-xs text-amber-400">
            {t("lowStock", { count: variant.availableQuantity })}
          </p>
        )}
      </div>
    </motion.li>
  );
}

export function CartDrawer() {
  const t = useTranslations("cart");
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const { isSignedIn } = useAuth();
  const { cart, isLoading } = useCart();
  const currency = useCurrencyStore((s) => s.currency);

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cart.subtotal);
  const progress = Math.min(100, (cart.subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-label={t("title")}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={drawerTransition}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.5 }}
            onDragEnd={(_, info) => {
              // Drag right past 80px (or a fast right flick) closes the drawer.
              if (info.offset.x > 80 || info.velocity.x > 500) close();
            }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md touch-pan-y flex-col bg-surface shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="font-serif text-xl font-light text-cream">
                {t("title")}{" "}
                <span className="text-muted-foreground">({cart.itemCount})</span>
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                className="text-muted-foreground transition-colors hover:text-cream"
              >
                <X className="size-5" />
              </button>
            </header>

            {!isSignedIn ? (
              <EmptyState
                title={t("signInTitle")}
                subtitle={t("signInSubtitle")}
                cta={{ href: "/sign-in", label: t("signIn") }}
                onNavigate={close}
              />
            ) : isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-gold" />
              </div>
            ) : cart.items.length === 0 ? (
              <EmptyState
                title={t("empty")}
                subtitle={t("emptySubtitle")}
                cta={{ href: "/parfumuri", label: t("exploreCollection") }}
                onNavigate={close}
              />
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 scrollbar-luxe">
                  <AnimatePresence initial={false}>
                    {groupCartItems(cart.items).map((group) =>
                      group.type === "bundle" ? (
                        <div
                          key={group.key}
                          className="my-3 border border-gold/30 bg-gold/[0.04] px-3"
                        >
                          <p className="flex items-center gap-2 border-b border-gold/20 py-2.5 text-xs font-medium uppercase tracking-wide text-gold">
                            <Package className="size-3.5" />
                            Set: {group.name}
                          </p>
                          <ul className="divide-y divide-border">
                            {group.items.map((item) => (
                              <LineItem key={item.id} item={item} />
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <ul key={group.key} className="divide-y divide-border">
                          <LineItem item={group.item} />
                        </ul>
                      ),
                    )}
                  </AnimatePresence>
                </div>

                <footer className="border-t border-border px-6 py-5">
                  <div className="mb-4">
                    {remaining > 0 ? (
                      <p className="mb-2 text-xs text-muted-foreground">
                        {t("addMoreForFreeShipping", {
                          amount: formatFromRon(remaining, currency),
                        })}
                      </p>
                    ) : (
                      <p className="mb-2 text-xs text-success">
                        {t("freeShippingUnlocked")}
                      </p>
                    )}
                    <div className="h-1 w-full overflow-hidden rounded-full bg-surface2">
                      <div
                        className="h-full bg-gold transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm uppercase tracking-wide text-muted-foreground">
                      {t("subtotal")}
                    </span>
                    <span className="font-serif text-xl text-cream">
                      {formatFromRon(cart.subtotal, currency)}
                    </span>
                  </div>

                  <Link
                    href="/cos"
                    onClick={close}
                    className="flex h-12 w-full items-center justify-center bg-gold text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
                  >
                    {t("checkout")}
                  </Link>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function EmptyState({
  title,
  subtitle,
  cta,
  onNavigate,
}: {
  title: string;
  subtitle: string;
  cta: { href: string; label: string };
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border text-muted-foreground">
        <ShoppingBag className="size-7" />
      </div>
      <div>
        <p className="font-serif text-xl text-cream">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Link
        href={cta.href}
        onClick={onNavigate}
        className="mt-2 border border-gold px-6 py-2.5 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
      >
        {cta.label}
      </Link>
    </div>
  );
}
