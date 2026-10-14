"use client";

import { useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { waitlistApi } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";

interface WaitlistButtonProps {
  perfumeId: string;
  perfumeName: string;
  /** Pre-filled email when the visitor is signed in. */
  defaultEmail?: string | null;
}

/**
 * Waitlist signup, shown on coming-soon products instead of Add to Cart. An
 * account is optional — an email is enough.
 */
export function WaitlistButton({
  perfumeId,
  perfumeName,
  defaultEmail,
}: WaitlistButtonProps) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const result = await waitlistApi.join({
        perfumeId,
        email: email.trim(),
      });
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
        Ești pe listă! Te anunțăm la lansarea „{perfumeName}”.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-border bg-surface p-4">
      <p className="mb-1 flex items-center gap-2 text-sm text-cream">
        <BellRing className="size-4 text-gold" />
        Lansare curând — înscrie-te pe lista de așteptare
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Te anunțăm primul când „{perfumeName}” devine disponibil.
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
            "Înscrie-mă"
          )}
        </button>
      </div>
    </form>
  );
}
