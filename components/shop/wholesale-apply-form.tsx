"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { Link } from "@/i18n/navigation";
import { wholesaleApi, ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";

/**
 * Wholesale application form. Shows the current application status when the user
 * already has an account; prompts sign-in when signed out.
 */
export function WholesaleApplyForm() {
  const { isSignedIn, isLoaded } = useUser();
  const [form, setForm] = useState({
    companyName: "",
    cui: "",
    website: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["wholesale", "my"],
    queryFn: wholesaleApi.my,
    enabled: Boolean(isSignedIn),
  });

  if (!isLoaded || (isSignedIn && isLoading)) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="border border-border bg-surface p-6 text-center">
        <p className="text-muted-foreground">
          Pentru a aplica, autentifică-te sau creează un cont.
        </p>
        <Link
          href="/sign-in?redirect_url=/wholesale"
          className="mt-4 inline-block border border-gold px-6 py-2.5 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Autentificare
        </Link>
      </div>
    );
  }

  if (existing?.hasAccount) {
    const active = existing.status === "ACTIVE";
    return (
      <div className="border border-border bg-surface p-6">
        <div className="flex items-center gap-2.5">
          {active ? (
            <Check className="size-5 text-emerald-400" />
          ) : (
            <Clock className="size-5 text-gold" />
          )}
          <h3 className="font-serif text-xl text-cream">
            {active ? "Cont wholesale activ" : "Cerere în analiză"}
          </h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {active
            ? `Discount activ: ${Math.round((existing.discountRate ?? 0) * 100)}%. Prețurile B2B se aplică automat la checkout.`
            : "Cererea ta a fost înregistrată. Te contactăm în cel mai scurt timp."}
        </p>
        <Link
          href="/cont/wholesale"
          className="mt-4 inline-block text-sm text-gold underline-offset-4 hover:underline"
        >
          Vezi contul wholesale →
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2.5 border border-gold/40 bg-gold/5 px-5 py-4 text-sm text-gold">
        <Check className="size-5 shrink-0" />
        Cererea a fost trimisă! Te contactăm după analiză.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    setSubmitting(true);
    try {
      await wholesaleApi.apply({
        companyName: form.companyName.trim(),
        cui: form.cui.trim() || undefined,
        website: form.website.trim() || undefined,
        message: form.message.trim() || undefined,
      });
      setSubmitted(true);
      toast.success("Cerere trimisă cu succes!");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Trimiterea a eșuat",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 border border-border bg-surface p-6"
    >
      <div>
        <label className="mb-1 block text-sm text-cream">Nume companie *</label>
        <Input
          required
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          placeholder="SC Parfumerie SRL"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-cream">CUI</label>
          <Input
            value={form.cui}
            onChange={(e) => setForm({ ...form, cui: e.target.value })}
            placeholder="RO12345678"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-cream">Website</label>
          <Input
            type="url"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-cream">Mesaj</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={4}
          placeholder="Spune-ne despre afacerea ta și volumul estimat…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 bg-gold py-3 text-sm font-medium uppercase tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : "Trimite cererea"}
      </button>
    </form>
  );
}
