"use client";

import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useTranslations, useLocale } from "next-intl";
import { SignOutButton } from "@clerk/nextjs";
import {
  Loader2,
  Package,
  LogOut,
  Sparkles,
  Users,
  Repeat,
  Heart,
  BadgeDollarSign,
  RotateCcw,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { ordersApi } from "@/lib/api-client";
import { ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from "@/lib/order-status";
import { useWishlist, useToggleWishlist } from "@/hooks/use-wishlist";
import { PerfumeCard } from "@/components/shop/perfume-card";
import { WishlistShareButton } from "@/components/shop/WishlistShareButton";
import { PushNotificationButton } from "@/components/shop/PushNotificationButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TABS = ["comenzi", "favorite", "profil"] as const;
type Tab = (typeof TABS)[number];

interface AccountUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export function AccountView({ user }: { user: AccountUser }) {
  const t = useTranslations("account");
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("comenzi"),
  );

  return (
    <div className="container py-28 md:py-32">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-luxe text-gold">{t("title")}</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-cream md:text-5xl">
          {t("greeting", { name: user.name })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>

      {/* Quick links to the dedicated member areas. */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <AccountLink href="/cont/puncte" icon={<Sparkles className="size-4" />}>
          {t("points")}
        </AccountLink>
        <AccountLink href="/refer" icon={<Users className="size-4" />}>
          {t("referral")}
        </AccountLink>
        <AccountLink href="/cont/abonament" icon={<Repeat className="size-4" />}>
          {t("subscription")}
        </AccountLink>
        <AccountLink
          href="/cont/afiliat"
          icon={<BadgeDollarSign className="size-4" />}
        >
          {t("affiliate")}
        </AccountLink>
        <AccountLink href="/pentru-tine" icon={<Heart className="size-4" />}>
          {t("forYou")}
        </AccountLink>
        <AccountLink
          href="/cont/retururi"
          icon={<RotateCcw className="size-4" />}
        >
          {t("returns")}
        </AccountLink>
      </div>

      <Tabs value={tab} onValueChange={(v) => void setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="comenzi">{t("orders")}</TabsTrigger>
          <TabsTrigger value="favorite">{t("favorites")}</TabsTrigger>
          <TabsTrigger value="profil">{t("profile")}</TabsTrigger>
        </TabsList>

        <TabsContent value="comenzi">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="favorite">
          <FavoritesTab userId={user.id} />
        </TabsContent>
        <TabsContent value="profil">
          <ProfileTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 border border-border bg-surface px-4 py-3 text-sm text-cream transition-colors hover:border-gold/50 hover:text-gold"
    >
      <span className="text-gold">{icon}</span>
      {children}
    </Link>
  );
}

function OrdersTab() {
  const t = useTranslations("account");
  const locale = useLocale();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: ordersApi.list,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Empty
        icon={<Package className="size-7" />}
        title={t("noOrders")}
        text={t("noOrdersDesc")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <article
          key={order.id}
          className="border border-border bg-surface p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-cream">
                #{order.orderNumber}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString(
                  locale === "en" ? "en-US" : "ro-RO",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
              </p>
            </div>
            <span
              className={cn(
                "rounded-sm border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                ORDER_STATUS_CLASS[order.status],
              )}
            >
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.perfumeName} · {item.sizeML} ml × {item.quantity}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">
              {order.trackingNumber
                ? `AWB: ${order.trackingNumber}`
                : t("total")}
            </span>
            <span className="font-serif text-lg text-gold">
              {formatPrice(order.total, order.currency)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function FavoritesTab({ userId }: { userId: string }) {
  const t = useTranslations("account");
  const { entries, isLoading } = useWishlist();
  const toggle = useToggleWishlist();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Empty
        icon={<span className="text-2xl">♡</span>}
        title={t("noFavorites")}
        text={t("noFavoritesDesc")}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <WishlistShareButton userId={userId} />
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
        <div key={entry.id} className="relative">
          <PerfumeCard perfume={entry.perfume} />
          <button
            type="button"
            onClick={() =>
              toggle.mutate({ perfumeId: entry.perfume.id, wishlisted: true })
            }
            className="absolute left-3 top-3 z-10 rounded-sm bg-background/80 px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur-sm transition-colors hover:text-error"
          >
            {t("removeFavorite")}
          </button>
        </div>
        ))}
      </div>
    </div>
  );
}

function ProfileTab({
  user,
}: {
  user: { name: string; email: string; isAdmin: boolean };
}) {
  const t = useTranslations("account");
  return (
    <div className="max-w-lg space-y-6">
      <div className="border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("name")}
        </p>
        <p className="mt-1 text-cream">{user.name}</p>
        <div className="my-4 h-px bg-border" />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("email")}
        </p>
        <p className="mt-1 text-cream">{user.email}</p>
      </div>

      <div className="border border-border bg-surface p-6">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
          {t("notifications")}
        </p>
        <p className="mb-3 text-sm text-muted-foreground">
          {t("notificationsDesc")}
        </p>
        <PushNotificationButton />
      </div>

      {user.isAdmin && (
        <a
          href="/admin"
          className="block border border-gold/40 bg-gold/5 px-6 py-4 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold/10"
        >
          {t("adminPanel")}
        </a>
      )}

      <SignOutButton redirectUrl="/">
        <button
          type="button"
          className="flex items-center gap-2 border border-border px-6 py-3 text-sm uppercase tracking-widest text-cream transition-colors hover:border-error hover:text-error"
        >
          <LogOut className="size-4" /> {t("logout")}
        </button>
      </SignOutButton>
    </div>
  );
}

function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-border text-muted-foreground">
        {icon}
      </div>
      <p className="font-serif text-2xl font-light text-cream">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
