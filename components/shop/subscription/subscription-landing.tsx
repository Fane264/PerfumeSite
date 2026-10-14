"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  Sparkles,
  Package,
  CreditCard,
  Truck,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { familyBadgeClass } from "@/lib/family";
import {
  subscriptionApi,
  type SubscriptionPlanDto,
  type BoxPreferencesDto,
} from "@/lib/api-client";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";

interface Option {
  slug: string;
  name: string;
}

export function SubscriptionLanding({
  plans,
  families,
  notes,
}: {
  plans: SubscriptionPlanDto[];
  families: Option[];
  notes: Option[];
}) {
  const t = useTranslations("subscription");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDto | null>(
    null,
  );

  const STEPS = [
    { icon: Sparkles, title: t("step1Title"), text: t("step1Desc") },
    { icon: CreditCard, title: t("step2Title"), text: t("step2Desc") },
    { icon: Truck, title: t("step3Title"), text: t("step3Desc") },
  ];

  const FAQ = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden border-b border-border bg-surface text-center">
        <div className="container py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs uppercase tracking-luxe text-gold">
              {t("eyebrow")}
            </p>
            <h1 className="mx-auto mt-4 max-w-3xl font-serif text-4xl font-light text-cream md:text-6xl">
              {t("title")}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
              {t("subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="container py-20">
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {plans.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground">
              {t("plansSoon")}
            </p>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col border bg-surface p-8",
                  plan.isFeatured ? "border-gold" : "border-border",
                )}
              >
                {plan.isFeatured && (
                  <span className="absolute -top-3 left-8 bg-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-background">
                    {t("mostPopular")}
                  </span>
                )}
                <h2 className="font-serif text-2xl font-light text-cream">
                  {plan.name}
                </h2>
                <p className="mt-2">
                  <span className="font-serif text-4xl text-gold">
                    {plan.price.toLocaleString("ro-RO")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    {plan.currency}{t("perMonth")}
                  </span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-cream">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.isFeatured ? "gold" : "outline"}
                  className="mt-8"
                  onClick={() => setSelectedPlan(plan)}
                >
                  {t("subscribe")}
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-surface py-20">
        <div className="container">
          <h2 className="text-center font-serif text-3xl font-light text-cream">
            {t("howItWorks")}
          </h2>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="mt-12 grid gap-8 md:grid-cols-3"
          >
            {STEPS.map((s, i) => (
              <motion.div key={s.title} variants={fadeUp} className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-gold/40 text-gold">
                  <s.icon className="size-6" />
                </div>
                <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                  {t("step", { n: i + 1 })}
                </p>
                <h3 className="mt-1 font-serif text-xl text-cream">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* What you get */}
      <section className="container py-20">
        <h2 className="text-center font-serif text-3xl font-light text-cream">
          {t("whatYouGet")}
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center border border-border bg-surface text-muted-2"
            >
              <Package className="size-8" />
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container pb-24">
        <h2 className="text-center font-serif text-3xl font-light text-cream">
          {t("faqTitle")}
        </h2>
        <div className="mx-auto mt-10 max-w-2xl divide-y divide-border border-y border-border">
          {FAQ.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </section>

      {selectedPlan && (
        <PreferencesModal
          plan={selectedPlan}
          families={families}
          notes={notes}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="text-cream">{q}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-gold transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <p className="mt-2 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

function PreferencesModal({
  plan,
  families,
  notes,
  onClose,
}: {
  plan: SubscriptionPlanDto;
  families: Option[];
  notes: Option[];
  onClose: () => void;
}) {
  const t = useTranslations("subscription");
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const GENDERS: { value: BoxPreferencesDto["gender"]; label: string }[] = [
    { value: "MASCULINE", label: t("genderMasculine") },
    { value: "FEMININE", label: t("genderFeminine") },
    { value: "UNISEX", label: t("genderUnisex") },
    { value: "SURPRISE", label: t("genderSurprise") },
  ];
  const [prefFamilies, setPrefFamilies] = useState<string[]>([]);
  const [excludeNotes, setExcludeNotes] = useState<string[]>([]);
  const [gender, setGender] = useState<BoxPreferencesDto["gender"]>("SURPRISE");

  const subscribe = useMutation({
    mutationFn: () =>
      subscriptionApi.subscribe(plan.id, {
        families: prefFamilies,
        excludeNotes,
        gender,
      }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
  });

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    slug: string,
  ) =>
    setList(
      list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug],
    );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-border bg-surface p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl font-light text-cream">
          {t("preferencesTitle", { plan: plan.name })}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("preferencesSubtitle")}
        </p>

        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            {t("preferredFamilies")}
          </p>
          <div className="flex flex-wrap gap-2">
            {families.map((f) => (
              <Chip
                key={f.slug}
                active={prefFamilies.includes(f.slug)}
                onClick={() => toggle(prefFamilies, setPrefFamilies, f.slug)}
                className={
                  prefFamilies.includes(f.slug) ? familyBadgeClass(f.slug) : undefined
                }
              >
                {f.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            {t("avoidedNotes")}
          </p>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {notes.map((n) => (
              <Chip
                key={n.slug}
                active={excludeNotes.includes(n.slug)}
                onClick={() => toggle(excludeNotes, setExcludeNotes, n.slug)}
              >
                {n.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            {t("preferredGender")}
          </p>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <Chip
                key={g.value}
                active={gender === g.value}
                onClick={() => setGender(g.value)}
              >
                {g.label}
              </Chip>
            ))}
          </div>
        </div>

        {subscribe.isError && (
          <p className="mt-4 text-sm text-error">
            {(subscribe.error as Error).message}
          </p>
        )}

        <div className="mt-8 flex gap-3">
          <Button
            variant="gold"
            className="flex-1"
            disabled={subscribe.isPending}
            onClick={() => {
              if (!isSignedIn) {
                router.push("/sign-in?redirect_url=/abonament");
                return;
              }
              subscribe.mutate();
            }}
          >
            {subscribe.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("continueToPayment")}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-gold bg-gold/10 text-gold"
          : "border-border text-cream hover:border-gold/50",
        className,
      )}
    >
      {children}
    </button>
  );
}
