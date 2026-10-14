"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { animate } from "framer-motion";
import {
  Loader2,
  Sparkles,
  Gift,
  Star,
  Users,
  Cake,
  Check,
  Copy,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loyaltyApi, type RedeemResult } from "@/lib/api-client";
import {
  LOYALTY_EVENT_LABEL,
  pointsToRon,
  TIER_FREE_SHIPPING,
  TIER_META,
  TIER_MULTIPLIERS,
  TIER_THRESHOLDS,
} from "@/lib/loyalty-ui";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);
  return <>{display.toLocaleString("ro-RO")}</>;
}

const EVENT_ICON: Record<string, typeof Star> = {
  PURCHASE: TrendingUp,
  REVIEW: Star,
  REFERRAL_SEND: Users,
  REFERRAL_RECEIVE: Gift,
  BIRTHDAY: Cake,
  REDEMPTION: Gift,
  EXPIRY: Sparkles,
  MANUAL_ADJUST: Sparkles,
};

export function LoyaltyView({ firstName }: { firstName: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["loyalty", "badge"],
    queryFn: loyaltyApi.get,
  });

  const [redeemPoints, setRedeemPoints] = useState(100);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [copied, setCopied] = useState(false);

  const maxRedeemable = useMemo(() => {
    if (!data) return 0;
    return Math.floor(data.balance / 100) * 100;
  }, [data]);

  const redeem = useMutation({
    mutationFn: () => loyaltyApi.redeem(redeemPoints),
    onSuccess: (res) => {
      setResult(res);
      void queryClient.invalidateQueries({ queryKey: ["loyalty"] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  const meta = TIER_META[data.tier];
  const nextMeta = data.nextTier ? TIER_META[data.nextTier] : null;
  const tierFloor = TIER_THRESHOLDS[data.tier];
  const tierCeil = data.nextTier ? TIER_THRESHOLDS[data.nextTier] : data.lifetime;
  const progress =
    tierCeil > tierFloor
      ? Math.min(100, ((data.lifetime - tierFloor) / (tierCeil - tierFloor)) * 100)
      : 100;

  return (
    <div className="container py-28 md:py-32">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-luxe text-gold">Programul de loialitate</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-cream md:text-5xl">
          Punctele tale, {firstName}
        </h1>
      </div>

      {/* Hero */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden border border-border bg-surface p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Puncte disponibile
              </p>
              <p className="mt-2 font-serif text-6xl font-light text-gold">
                <AnimatedNumber value={data.balance} />
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                ≈ {pointsToRon(data.balance).toLocaleString("ro-RO")} RON reducere
              </p>
              {data.expiringThisMonth > 0 && (
                <p className="mt-2 text-xs text-amber-400">
                  {data.expiringThisMonth.toLocaleString("ro-RO")} puncte expiră luna aceasta
                </p>
              )}
            </div>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                meta.badge,
              )}
            >
              <Sparkles className="size-4" /> {meta.label}
            </span>
          </div>

          {/* Progress to next tier */}
          <div className="mt-8">
            {data.nextTier ? (
              <>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Până la {nextMeta?.label.toUpperCase()}:{" "}
                    <span className="text-cream">
                      {data.nextTierPoints.toLocaleString("ro-RO")} puncte
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {data.lifetime.toLocaleString("ro-RO")} /{" "}
                    {tierCeil.toLocaleString("ro-RO")}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
                  <div
                    className={cn("h-full rounded-full transition-all", meta.bar)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-purple-300">
                ✦ Ai atins cel mai înalt nivel — Platinum. Mulțumim!
              </p>
            )}
          </div>
        </div>

        {/* Tier benefits comparison */}
        <div className="border border-border bg-surface p-8">
          <h2 className="font-serif text-xl font-light text-cream">
            Beneficiile tale
          </h2>
          <BenefitRow
            label="Multiplicator puncte"
            current={`×${TIER_MULTIPLIERS[data.tier]}`}
            next={data.nextTier ? `×${TIER_MULTIPLIERS[data.nextTier]}` : null}
          />
          <BenefitRow
            label="Transport gratuit de la"
            current={
              TIER_FREE_SHIPPING[data.tier] === 0
                ? "Întotdeauna"
                : `${TIER_FREE_SHIPPING[data.tier]} RON`
            }
            next={
              data.nextTier
                ? TIER_FREE_SHIPPING[data.nextTier] === 0
                  ? "Întotdeauna"
                  : `${TIER_FREE_SHIPPING[data.nextTier]} RON`
                : null
            }
          />
          {nextMeta && (
            <p className="mt-4 text-xs text-muted-foreground">
              Avansează la{" "}
              <span className={nextMeta.accent}>{nextMeta.label}</span> pentru
              beneficii sporite.
            </p>
          )}
        </div>
      </div>

      {/* Redemption */}
      <div className="mt-6 border border-border bg-surface p-8">
        <h2 className="font-serif text-2xl font-light text-cream">
          Transformă punctele în reducere
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          100 de puncte = 5 RON. Alege câte puncte vrei să folosești.
        </p>

        {maxRedeemable < 100 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Ai nevoie de cel puțin 100 de puncte pentru a genera un cod de reducere.
          </p>
        ) : result ? (
          <div className="mt-6 border border-gold/40 bg-gold/5 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Cod de reducere generat — {result.discountAmount.toLocaleString("ro-RO")} RON
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <code className="font-mono text-2xl tracking-widest text-gold">
                {result.couponCode}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(result.couponCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                aria-label="Copiază codul"
                className="flex size-9 items-center justify-center rounded-sm border border-border text-cream transition-colors hover:text-gold"
              >
                {copied ? <Check className="size-4 text-gold" /> : <Copy className="size-4" />}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Aplică acest cod la finalizarea comenzii. Valabil 90 de zile.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setResult(null);
                setRedeemPoints(100);
              }}
            >
              Generează altul
            </Button>
          </div>
        ) : (
          <div className="mt-6 max-w-xl">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="font-serif text-4xl font-light text-gold">
                  {pointsToRon(redeemPoints).toLocaleString("ro-RO")} RON
                </p>
                <p className="text-xs text-muted-foreground">
                  {redeemPoints.toLocaleString("ro-RO")} puncte
                </p>
              </div>
            </div>
            <Slider
              value={[redeemPoints]}
              min={100}
              max={maxRedeemable}
              step={100}
              onValueChange={(v) => setRedeemPoints(v[0] ?? 100)}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>100</span>
              <span>{maxRedeemable.toLocaleString("ro-RO")}</span>
            </div>

            {redeem.isError && (
              <p className="mt-4 text-sm text-error">
                {(redeem.error as Error).message}
              </p>
            )}

            <Button
              variant="gold"
              className="mt-6"
              disabled={redeem.isPending}
              onClick={() => redeem.mutate()}
            >
              {redeem.isPending && <Loader2 className="size-4 animate-spin" />}
              Transformă în reducere
            </Button>
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="mt-6">
        <h2 className="mb-4 font-serif text-2xl font-light text-cream">Istoric</h2>
        {data.transactions.length === 0 ? (
          <p className="border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Nu ai încă tranzacții. Câștigă puncte la fiecare comandă.
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border bg-surface">
            {data.transactions.map((t) => {
              const Icon = EVENT_ICON[t.type] ?? Sparkles;
              const positive = t.points > 0;
              return (
                <li key={t.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-gold">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cream">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {LOYALTY_EVENT_LABEL[t.type] ?? t.type} ·{" "}
                      {new Date(t.createdAt).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-sm font-medium",
                      positive ? "text-emerald-400" : "text-muted-foreground",
                    )}
                  >
                    {positive ? "+" : ""}
                    {t.points.toLocaleString("ro-RO")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function BenefitRow({
  label,
  current,
  next,
}: {
  label: string;
  current: string;
  next: string | null;
}) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-cream">{current}</span>
        {next && next !== current && (
          <span className="text-xs text-muted-foreground">→ {next}</span>
        )}
      </div>
    </div>
  );
}
