"use client";

import { useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";

interface RestockNotifyProps {
  variantId: string;
  sizeML: number;
}

/** Restock alert capture, shown when the selected variant is out of stock. */
export function RestockNotify({ variantId, sizeML }: RestockNotifyProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const result = await apiFetch<{ message: string }>(
        "/api/restock-notify",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), variantId }),
        },
      );
      setDone(true);
      toast.success(result.message);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Înscrierea a eșuat",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2.5 border border-gold/40 bg-gold/5 px-4 py-3.5 text-sm text-gold">
        <Check className="size-4 shrink-0" />
        Te vom anunța când decantul de {sizeML} ml revine în stoc.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-border bg-surface p-4">
      <p className="mb-1 flex items-center gap-2 text-sm text-cream">
        <BellRing className="size-4 text-gold" />
        Stoc epuizat la {sizeML} ml
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Lasă-ne adresa de email și te anunțăm imediat ce revine în stoc.
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="adresa@email.com"
        />
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 whitespace-nowrap border border-gold px-4 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-background disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Anunță-mă"
          )}
        </button>
      </div>
    </form>
  );
}
