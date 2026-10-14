"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Gift, Loader2, Lock, Mail, Sparkles, Check } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { cn, formatPrice } from "@/lib/utils";
import {
  GIFT_CARD_VALUES,
  GIFT_CARD_MIN,
  GIFT_CARD_MAX,
} from "@/lib/validations/gift-card";
import { giftCardsApi, ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  value: z.number().min(GIFT_CARD_MIN).max(GIFT_CARD_MAX),
  recipientName: z.string().trim().min(1),
  recipientEmail: z.string().trim().email(),
  personalMessage: z.string().trim().max(200).optional(),
});

export default function GiftCardPage() {
  const t = useTranslations("giftCard");
  const STEPS = [
    { icon: Gift, title: t("step1Title"), text: t("step1Desc") },
    { icon: Mail, title: t("step2Title"), text: t("step2Desc") },
    { icon: Check, title: t("step3Title"), text: t("step3Desc") },
  ];
  const { isLoaded, isSignedIn } = useAuth();
  const [value, setValue] = useState<number>(100);
  const [custom, setCustom] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const effectiveValue = useMemo(() => {
    const c = Number(custom);
    return custom && Number.isFinite(c) && c > 0 ? c : value;
  }, [custom, value]);

  async function buy() {
    const parsed = formSchema.safeParse({
      value: effectiveValue,
      recipientName,
      recipientEmail,
      personalMessage: personalMessage || undefined,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = t(`err.${key}`);
      }
      setErrors(next);
      return;
    }
    setErrors({});

    if (!isSignedIn) {
      toast.error(t("signInRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await giftCardsApi.purchase(parsed.data);
      window.location.href = result.url;
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("purchaseFailed"),
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-28 md:py-32">
      <header className="mb-12 max-w-2xl">
        <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-luxe text-gold">
          <Gift className="size-4" /> {t("eyebrow")}
        </p>
        <h1 className="font-serif text-4xl font-light text-gold md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_minmax(340px,42%)]">
        {/* ---- Form ---- */}
        <div className="space-y-8">
          {/* Value selector */}
          <section>
            <h2 className="mb-4 text-xs uppercase tracking-luxe text-gold">
              {t("valueLabel")}
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {GIFT_CARD_VALUES.map((v) => {
                const active = !custom && value === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setValue(v);
                      setCustom("");
                    }}
                    className={cn(
                      "border py-4 text-center transition-colors",
                      active
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-cream hover:border-gold/40",
                    )}
                  >
                    <span className="font-serif text-xl">{v}</span>
                    <span className="block text-xs text-muted-foreground">
                      RON
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              <Label htmlFor="custom" className="mb-1.5 block">
                {t("customAmount")}
              </Label>
              <Input
                id="custom"
                type="number"
                min={GIFT_CARD_MIN}
                max={GIFT_CARD_MAX}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={`${GIFT_CARD_MIN} – ${GIFT_CARD_MAX}`}
              />
              {errors.value && (
                <p className="mt-1.5 text-xs text-error">{errors.value}</p>
              )}
            </div>
          </section>

          {/* Recipient */}
          <section>
            <h2 className="mb-4 text-xs uppercase tracking-luxe text-gold">
              {t("recipientSection")}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">{t("recipientName")}</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={t("placeholderName")}
                />
                {errors.recipientName && (
                  <p className="mt-1.5 text-xs text-error">
                    {errors.recipientName}
                  </p>
                )}
              </div>
              <div>
                <Label className="mb-1.5 block">{t("recipientEmail")}</Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder={t("placeholderEmail")}
                />
                {errors.recipientEmail && (
                  <p className="mt-1.5 text-xs text-error">
                    {errors.recipientEmail}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">
                  {t("message")}
                </Label>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder={t("placeholderMessage")}
                  className="w-full border border-input bg-surface2 px-3.5 py-2.5 text-sm text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-muted-2">
                  {personalMessage.length}/200
                </p>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={buy}
            disabled={submitting || !isLoaded}
            className="flex w-full items-center justify-center gap-2 bg-gold py-3.5 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" /> {t("redirecting")}
              </>
            ) : (
              <>
                <Lock className="size-4" /> {t("buyCta")} ·{" "}
                {formatPrice(effectiveValue, "RON")}
              </>
            )}
          </button>
          {isLoaded && !isSignedIn && (
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/sign-in" className="text-gold hover:underline">
                {t("signInLink")}
              </Link>{" "}
              {t("signInToComplete")}
            </p>
          )}
        </div>

        {/* ---- Live preview ---- */}
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <p className="mb-4 text-xs uppercase tracking-luxe text-gold">
            {t("previewSection")}
          </p>
          <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-surface p-8 shadow-2xl">
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-gold/10 blur-2xl" />
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-luxe text-gold">
                DÉCANT
              </span>
              <Sparkles className="size-5 text-gold" />
            </div>
            <p className="mt-10 font-serif text-5xl font-light text-cream">
              {formatPrice(effectiveValue, "RON")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t("previewLabel")}</p>
            <p className="mt-8 font-mono text-lg tracking-[0.3em] text-gold">
              GIFT-XXXX-XXXX
            </p>
            {personalMessage && (
              <p className="mt-6 border-l-2 border-gold/50 pl-3 text-sm italic text-cream/80">
                „{personalMessage}”
              </p>
            )}
            <p className="mt-6 text-xs text-muted-2">
              {t("previewFor", { name: recipientName || t("previewForDefault") })}
            </p>
          </div>

          <div className="mt-10">
            <h2 className="mb-5 text-xs uppercase tracking-luxe text-gold">
              {t("howItWorksTitle")}
            </h2>
            <ol className="space-y-5">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold">
                    <step.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm text-cream">
                      {i + 1}. {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
