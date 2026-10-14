"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  Check,
  ChevronLeft,
  CreditCard,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { shippingAddressSchema } from "@/lib/validations/order";
import {
  SHIPPING_METHODS,
  estimatedDeliveryLabel,
  resolveShippingCost,
  COD_FEE,
  type ShippingMethodId,
} from "@/lib/shipping";
import {
  FREE_SHIPPING_THRESHOLD,
  GIFT_WRAP_FEE,
} from "@/lib/constants";
import { formatFromRon } from "@/lib/currency";
import { useCurrencyStore } from "@/store/currency-store";
import {
  apiFetch,
  ApiError,
  couponsApi,
  type CheckoutResult,
  type CouponValidation,
} from "@/lib/api-client";
import { useCart } from "@/hooks/use-cart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROMANIAN_COUNTIES } from "@/lib/shipping";
import {
  GiftCardInput,
  type AppliedGiftCard,
} from "@/components/shop/gift-card-input";
import { Gift } from "lucide-react";

// ---------------------------------------------------------------------------
//  Form model
// ---------------------------------------------------------------------------

interface ContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
}

const EMPTY: ContactForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  county: "",
  postalCode: "",
  country: "România",
};

const contactSchema = z
  .object({
    firstName: z.string().trim().min(1, "Prenumele este obligatoriu"),
    lastName: z.string().trim().min(1, "Numele este obligatoriu"),
    email: z.string().trim().email("Adresă de email invalidă"),
  })
  .and(
    shippingAddressSchema.pick({
      phone: true,
      line1: true,
      city: true,
      county: true,
      postalCode: true,
    }),
  );

type FieldErrors = Partial<Record<keyof ContactForm, string>>;

const STEPS = [
  { id: 1, label: "Contact & Livrare" },
  { id: 2, label: "Metodă de livrare" },
  { id: 3, label: "Revizuire & Plată" },
] as const;

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const { isSignedIn, isLoaded } = useAuth();
  const { cart, isLoading } = useCart();

  const currency = useCurrencyStore((s) => s.currency);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<ContactForm>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethodId>("standard");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "COD">("CARD");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Coupon state.
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Gift card + gift wrap state.
  const [giftCard, setGiftCard] = useState<AppliedGiftCard | null>(null);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftWrapMessage, setGiftWrapMessage] = useState("");

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const subtotal = cart.subtotal;
  const couponDiscount = coupon?.discountAmount ?? 0;
  const shippingCost = resolveShippingCost(shippingMethod, subtotal);
  const giftWrapFee = giftWrap ? GIFT_WRAP_FEE : 0;
  const codFee = paymentMethod === "COD" ? COD_FEE : 0;
  // Amount the gift card can apply to, after coupon, capped to goods + extras.
  const amountBeforeGift = Math.max(
    0,
    round2(subtotal + giftWrapFee - couponDiscount),
  );
  const giftCardApplied = giftCard
    ? Math.min(giftCard.applied, amountBeforeGift)
    : 0;
  const total = round2(
    Math.max(0, subtotal + giftWrapFee - couponDiscount - giftCardApplied) +
      shippingCost +
      codFee,
  );

  function update<K extends keyof ContactForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateContact(): boolean {
    const result = contactSchema.safeParse(form);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof ContactForm;
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return false;
  }

  function goToStep2() {
    if (validateContact()) setStep(2);
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await couponsApi.validate(code, subtotal);
      setCoupon(result);
      toast.success("Cupon aplicat");
    } catch (error) {
      setCoupon(null);
      setCouponError(
        error instanceof ApiError ? error.message : "Cupon invalid",
      );
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function placeOrder() {
    setSubmitting(true);
    try {
      const result = await apiFetch<CheckoutResult>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          shippingAddress: {
            name: `${form.firstName} ${form.lastName}`.trim(),
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            county: form.county,
            postalCode: form.postalCode,
            country: form.country,
            phone: form.phone,
          },
          shippingMethod,
          paymentMethod,
          currency,
          couponCode: coupon?.code,
          giftCardCode: giftCard?.code,
          giftWrap,
          giftWrapMessage:
            giftWrap && giftWrapMessage.trim()
              ? giftWrapMessage.trim()
              : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (result.type === "cod") {
        window.location.href = `/checkout/confirmare?order=${result.orderId}`;
      } else {
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Finalizarea a eșuat",
      );
      setSubmitting(false);
    }
  }

  // --- Guard states --------------------------------------------------------

  if (isLoaded && !isSignedIn) {
    return (
      <Centered
        title={t("signInRequiredTitle")}
        text={t("signInRequiredText")}
        cta={{ href: "/sign-in", label: tc("signIn") }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="container flex justify-center py-40">
        <Loader2 className="size-7 animate-spin text-gold" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Centered
        title={t("emptyCart")}
        text={t("emptyCartText")}
        cta={{ href: "/parfumuri", label: tc("exploreCollection") }}
      />
    );
  }

  return (
    <div className="container py-28 md:py-32">
      <h1 className="mb-10 font-serif text-4xl font-light text-cream md:text-5xl">
        {t("title")}
      </h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_minmax(340px,40%)]">
        {/* ---- Left: steps ---- */}
        <div>
          <StepIndicator current={step} onJump={(s) => s < step && setStep(s)} />

          <div className="mt-10">
            {step === 1 && (
              <StepContact
                form={form}
                errors={errors}
                onChange={update}
                onNext={goToStep2}
                giftWrap={giftWrap}
                onGiftWrap={setGiftWrap}
                giftWrapMessage={giftWrapMessage}
                onGiftWrapMessage={setGiftWrapMessage}
              />
            )}
            {step === 2 && (
              <StepShipping
                method={shippingMethod}
                onSelect={setShippingMethod}
                subtotal={subtotal}
                notes={notes}
                onNotes={setNotes}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <StepReview
                form={form}
                shippingMethod={shippingMethod}
                paymentMethod={paymentMethod}
                onPaymentMethod={setPaymentMethod}
                notes={notes}
                submitting={submitting}
                onEditContact={() => setStep(1)}
                onEditShipping={() => setStep(2)}
                onBack={() => setStep(2)}
                onSubmit={placeOrder}
              />
            )}
          </div>
        </div>

        {/* ---- Right: sticky summary ---- */}
        <OrderSummary
          cart={cart}
          subtotal={subtotal}
          giftWrapFee={giftWrapFee}
          giftCardApplied={giftCardApplied}
          shippingCost={shippingCost}
          codFee={codFee}
          total={total}
          shippingMethod={shippingMethod}
          paymentMethod={paymentMethod}
          coupon={coupon}
          couponInput={couponInput}
          couponLoading={couponLoading}
          couponError={couponError}
          onCouponInput={setCouponInput}
          onApplyCoupon={applyCoupon}
          onRemoveCoupon={removeCoupon}
          giftCard={giftCard}
          onApplyGiftCard={setGiftCard}
          onRemoveGiftCard={() => setGiftCard(null)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  current,
  onJump,
}: {
  current: number;
  onJump: (step: 1 | 2 | 3) => void;
}) {
  return (
    <ol className="flex items-center gap-3">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => onJump(s.id as 1 | 2 | 3)}
              disabled={!done}
              className="flex items-center gap-2.5 text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm transition-colors",
                  active && "border-gold bg-gold text-background",
                  done && "border-gold bg-transparent text-gold",
                  !active && !done && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : s.id}
              </span>
              <span
                className={cn(
                  "hidden text-xs uppercase tracking-wide sm:block",
                  active ? "text-cream" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  current > s.id ? "bg-gold" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
//  Step 1 — contact & address
// ---------------------------------------------------------------------------

function StepContact({
  form,
  errors,
  onChange,
  onNext,
  giftWrap,
  onGiftWrap,
  giftWrapMessage,
  onGiftWrapMessage,
}: {
  form: ContactForm;
  errors: FieldErrors;
  onChange: <K extends keyof ContactForm>(key: K, value: string) => void;
  onNext: () => void;
  giftWrap: boolean;
  onGiftWrap: (value: boolean) => void;
  giftWrapMessage: string;
  onGiftWrapMessage: (value: string) => void;
}) {
  const currency = useCurrencyStore((s) => s.currency);
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <h2 className="text-xs uppercase tracking-luxe text-gold">
        Contact & livrare
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Prenume" error={errors.firstName}>
          <Input
            value={form.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Nume" error={errors.lastName}>
          <Input
            value={form.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            autoComplete="family-name"
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Telefon" error={errors.phone}>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="07xx xxx xxx"
            autoComplete="tel"
          />
        </Field>
        <Field label="Adresă (stradă, număr)" error={errors.line1} className="sm:col-span-2">
          <Input
            value={form.line1}
            onChange={(e) => onChange("line1", e.target.value)}
            autoComplete="address-line1"
          />
        </Field>
        <Field
          label="Apartament, bloc, scară (opțional)"
          className="sm:col-span-2"
        >
          <Input
            value={form.line2}
            onChange={(e) => onChange("line2", e.target.value)}
            autoComplete="address-line2"
          />
        </Field>
        <Field label="Oraș" error={errors.city}>
          <Input
            value={form.city}
            onChange={(e) => onChange("city", e.target.value)}
            autoComplete="address-level2"
          />
        </Field>
        <Field label="Județ" error={errors.county}>
          <select
            value={form.county}
            onChange={(e) => onChange("county", e.target.value)}
            className="h-11 w-full border border-input bg-surface2 px-3 text-sm text-cream focus:border-gold focus:outline-none"
          >
            <option value="" className="bg-surface2">
              Selectează județul
            </option>
            {ROMANIAN_COUNTIES.map((c) => (
              <option key={c} value={c} className="bg-surface2">
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cod poștal" error={errors.postalCode}>
          <Input
            value={form.postalCode}
            onChange={(e) => onChange("postalCode", e.target.value)}
            inputMode="numeric"
            placeholder="6 cifre"
            autoComplete="postal-code"
          />
        </Field>
        <Field label="Țară">
          <Input value={form.country} disabled readOnly />
        </Field>
      </div>

      {/* Gift wrap option */}
      <div className="border border-border bg-surface p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={giftWrap}
            onChange={(e) => onGiftWrap(e.target.checked)}
            className="mt-1 size-4 accent-[#C9A84C]"
          />
          <span className="flex-1">
            <span className="flex items-center gap-2 text-cream">
              <Gift className="size-4 text-gold" />
              Adaugă împachetare premium{" "}
              <span className="text-gold">
                (+{formatFromRon(GIFT_WRAP_FEE, currency)})
              </span>
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Cutie cadou elegantă, sigilată cu grijă, cu mesajul tău personal.
            </span>
          </span>
        </label>
        <AnimatePresence>
          {giftWrap && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <textarea
                rows={2}
                maxLength={200}
                value={giftWrapMessage}
                onChange={(e) => onGiftWrapMessage(e.target.value)}
                placeholder="Mesaj personal pe card (opțional)…"
                className="mt-4 w-full border border-input bg-surface2 px-3.5 py-2.5 text-sm text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-2 w-full bg-gold py-3.5 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
      >
        Continuă spre livrare
      </button>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
//  Step 2 — shipping method
// ---------------------------------------------------------------------------

function StepShipping({
  method,
  onSelect,
  subtotal,
  notes,
  onNotes,
  onBack,
  onNext,
}: {
  method: ShippingMethodId;
  onSelect: (id: ShippingMethodId) => void;
  subtotal: number;
  notes: string;
  onNotes: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const currency = useCurrencyStore((s) => s.currency);
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <h2 className="text-xs uppercase tracking-luxe text-gold">
        Metodă de livrare
      </h2>

      <div className="space-y-3">
        {SHIPPING_METHODS.map((m) => {
          const active = method === m.id;
          const cost = resolveShippingCost(m.id, subtotal);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              className={cn(
                "flex w-full items-center gap-4 border p-5 text-left transition-colors",
                active
                  ? "border-gold bg-gold/5"
                  : "border-border hover:border-gold/40",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  active ? "border-gold" : "border-muted-foreground",
                )}
              >
                {active && <span className="size-2.5 rounded-full bg-gold" />}
              </span>
              <Truck className="size-5 shrink-0 text-gold" />
              <div className="flex-1">
                <p className="text-cream">
                  Livrare {m.label}{" "}
                  <span className="text-muted-foreground">· {m.description}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Estimat: {estimatedDeliveryLabel(m.id)}
                </p>
              </div>
              <span className="text-sm text-cream">
                {cost === 0 ? "GRATUIT" : formatFromRon(cost, currency)}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <Label className="mb-1.5 block">Note pentru comandă (opțional)</Label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Instrucțiuni pentru curier, detalii suplimentare…"
          className="w-full border border-input bg-surface2 px-3.5 py-2.5 text-sm text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 border border-border px-6 py-3.5 text-sm uppercase tracking-widest text-cream transition-colors hover:border-gold"
        >
          <ChevronLeft className="size-4" /> Înapoi
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 bg-gold py-3.5 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
        >
          Continuă spre plată
        </button>
      </div>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
//  Step 3 — review & pay
// ---------------------------------------------------------------------------

function StepReview({
  form,
  shippingMethod,
  paymentMethod,
  onPaymentMethod,
  notes,
  submitting,
  onEditContact,
  onEditShipping,
  onBack,
  onSubmit,
}: {
  form: ContactForm;
  shippingMethod: ShippingMethodId;
  paymentMethod: "CARD" | "COD";
  onPaymentMethod: (value: "CARD" | "COD") => void;
  notes: string;
  submitting: boolean;
  onEditContact: () => void;
  onEditShipping: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const currency = useCurrencyStore((s) => s.currency);
  const method = SHIPPING_METHODS.find((m) => m.id === shippingMethod)!;
  const isCod = paymentMethod === "COD";
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-xs uppercase tracking-luxe text-gold">
        Revizuire & plată
      </h2>

      {/* Payment method */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-cream">Metodă de plată</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onPaymentMethod("CARD")}
            className={cn(
              "flex items-center gap-3 border p-4 text-left transition-colors",
              !isCod ? "border-gold bg-gold/5" : "border-border hover:border-gold/40",
            )}
          >
            <CreditCard className="size-5 shrink-0 text-gold" />
            <span>
              <span className="block text-sm text-cream">Card bancar</span>
              <span className="block text-xs text-muted-foreground">
                Plată securizată Stripe
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onPaymentMethod("COD")}
            className={cn(
              "flex items-center gap-3 border p-4 text-left transition-colors",
              isCod ? "border-gold bg-gold/5" : "border-border hover:border-gold/40",
            )}
          >
            <Banknote className="size-5 shrink-0 text-gold" />
            <span>
              <span className="block text-sm text-cream">Ramburs</span>
              <span className="block text-xs text-muted-foreground">
                Numerar la livrare (+{formatFromRon(COD_FEE, currency)})
              </span>
            </span>
          </button>
        </div>
      </div>

      <ReviewBlock title="Contact & livrare" onEdit={onEditContact}>
        <p className="text-cream">
          {form.firstName} {form.lastName}
        </p>
        <p>{form.email}</p>
        <p>{form.phone}</p>
        <p className="mt-2">
          {form.line1}
          {form.line2 ? `, ${form.line2}` : ""}
        </p>
        <p>
          {form.postalCode} {form.city}, {form.county}
        </p>
        <p>{form.country}</p>
      </ReviewBlock>

      <ReviewBlock title="Metodă de livrare" onEdit={onEditShipping}>
        <p className="text-cream">
          Livrare {method.label} · {method.description}
        </p>
        <p className="mt-1">
          Livrare estimată: {estimatedDeliveryLabel(shippingMethod)}
        </p>
        {notes && <p className="mt-2 italic">„{notes}”</p>}
      </ReviewBlock>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex items-center gap-1.5 border border-border px-6 py-3.5 text-sm uppercase tracking-widest text-cream transition-colors hover:border-gold disabled:opacity-60"
        >
          <ChevronLeft className="size-4" /> Înapoi
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex flex-1 items-center justify-center gap-2 bg-gold py-3.5 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="size-5 animate-spin" />{" "}
              {isCod ? "Se înregistrează…" : "Te redirecționăm…"}
            </>
          ) : (
            <>
              <Lock className="size-4" />{" "}
              {isCod ? "Plasează comanda" : "Finalizează comanda"}
            </>
          )}
        </button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {isCod
          ? "Comanda se înregistrează cu plata la livrare. Vei fi contactat pentru confirmare."
          : "Vei fi redirecționat către Stripe pentru plata securizată."}
      </p>
    </motion.section>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-cream">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs uppercase tracking-wide text-gold transition-colors hover:text-gold-light"
        >
          <Pencil className="size-3" /> Editează
        </button>
      </div>
      <div className="space-y-0.5 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Order summary (sticky)
// ---------------------------------------------------------------------------

function OrderSummary({
  cart,
  subtotal,
  giftWrapFee,
  giftCardApplied,
  shippingCost,
  codFee,
  total,
  shippingMethod,
  paymentMethod,
  coupon,
  couponInput,
  couponLoading,
  couponError,
  onCouponInput,
  onApplyCoupon,
  onRemoveCoupon,
  giftCard,
  onApplyGiftCard,
  onRemoveGiftCard,
}: {
  cart: ReturnType<typeof useCart>["cart"];
  subtotal: number;
  giftWrapFee: number;
  giftCardApplied: number;
  shippingCost: number;
  codFee: number;
  total: number;
  shippingMethod: ShippingMethodId;
  paymentMethod: "CARD" | "COD";
  coupon: CouponValidation | null;
  couponInput: string;
  couponLoading: boolean;
  couponError: string | null;
  onCouponInput: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  giftCard: AppliedGiftCard | null;
  onApplyGiftCard: (card: AppliedGiftCard) => void;
  onRemoveGiftCard: () => void;
}) {
  const currency = useCurrencyStore((s) => s.currency);
  const fmt = (ron: number) => formatFromRon(ron, currency);
  const remainingForFree = useMemo(
    () => Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
    [subtotal],
  );

  return (
    <aside className="h-fit lg:sticky lg:top-28">
      <div className="border border-border bg-surface p-6">
        <h2 className="mb-5 font-serif text-xl font-light text-cream">
          Sumar comandă
        </h2>

        <ul className="mb-5 space-y-4">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden bg-surface2">
                {item.variant.perfume.primaryImage && (
                  <Image
                    src={item.variant.perfume.primaryImage.url}
                    alt={item.variant.perfume.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gold text-[11px] font-medium text-background">
                  {item.quantity}
                </span>
              </div>
              <div className="flex flex-1 justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-cream">
                    {item.variant.perfume.name}
                  </p>
                  <p className="text-xs text-gold">
                    {item.variant.perfume.house.name}
                  </p>
                  <p className="text-muted-foreground">
                    {item.variant.sizeML} ml
                  </p>
                </div>
                <span className="whitespace-nowrap text-cream">
                  {fmt(item.lineTotal)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Coupon */}
        <div className="mb-5 border-t border-border pt-5">
          {coupon ? (
            <div className="flex items-center justify-between border border-gold/40 bg-gold/5 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-gold">
                <Tag className="size-4" /> {coupon.code}
              </span>
              <button
                type="button"
                onClick={onRemoveCoupon}
                aria-label="Elimină cuponul"
                className="text-muted-foreground hover:text-cream"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <Label htmlFor="coupon" className="mb-1.5 block">
                Cod reducere
              </Label>
              <div className="flex gap-2">
                <Input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => onCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onApplyCoupon();
                    }
                  }}
                  placeholder="ex. WELCOME10"
                  className="uppercase"
                />
                <button
                  type="button"
                  onClick={onApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="shrink-0 border border-gold px-4 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-background disabled:opacity-50"
                >
                  {couponLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Aplică"
                  )}
                </button>
              </div>
              {couponError && (
                <p className="mt-1.5 text-xs text-error">{couponError}</p>
              )}
            </>
          )}

          <GiftCardInput
            cartSubtotal={subtotal}
            giftCard={giftCard}
            onApply={onApplyGiftCard}
            onRemove={onRemoveGiftCard}
          />
        </div>

        <dl className="space-y-2.5 border-t border-border pt-4 text-sm">
          <Row label="Subtotal" value={fmt(subtotal)} />
          {giftWrapFee > 0 && (
            <Row label="Împachetare premium" value={fmt(giftWrapFee)} />
          )}
          {coupon && coupon.discountAmount > 0 && (
            <Row
              label={`Cupon (${coupon.code})`}
              value={`− ${fmt(coupon.discountAmount)}`}
              accent
            />
          )}
          {giftCardApplied > 0 && (
            <Row
              label="Card cadou"
              value={`− ${fmt(giftCardApplied)}`}
              accent
            />
          )}
          <Row
            label={`Transport (${shippingMethod === "express" ? "Express" : "Standard"})`}
            value={shippingCost === 0 ? "Gratuit" : fmt(shippingCost)}
          />
          {codFee > 0 && (
            <Row label="Taxă ramburs" value={fmt(codFee)} />
          )}
          {remainingForFree > 0 && shippingMethod === "standard" && (
            <p className="text-xs text-muted-foreground">
              Mai adaugă {fmt(remainingForFree)} pentru transport gratuit.
            </p>
          )}
          <div className="flex justify-between border-t border-border pt-3 font-serif text-lg">
            <dt className="text-cream">Total</dt>
            <dd className="text-gold">{fmt(total)}</dd>
          </div>
        </dl>
      </div>

      {/* Security badges */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Lock className="size-3.5 text-gold" />{" "}
          {paymentMethod === "COD"
            ? "Plată la livrare"
            : "Plată securizată Stripe"}
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-gold" /> SSL
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-gold" /> Date protejate
        </span>
      </div>
    </aside>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={accent ? "text-gold" : "text-cream"}>{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Shared bits
// ---------------------------------------------------------------------------

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 text-xs text-error"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Centered({
  title,
  text,
  cta,
}: {
  title: string;
  text: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="container flex flex-col items-center py-40 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full border border-border text-muted-foreground">
        <ShoppingBag className="size-7" />
      </div>
      <h1 className="font-serif text-3xl font-light text-cream">{title}</h1>
      <p className="mt-3 text-muted-foreground">{text}</p>
      <Link
        href={cta.href}
        className="mt-6 border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
      >
        {cta.label}
      </Link>
    </div>
  );
}
