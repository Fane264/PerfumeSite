"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api-client";

/** Email capture used in the footer and the homepage newsletter section. */
export function NewsletterForm({ className }: { className?: string }) {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading" || status === "done") return;
    setStatus("loading");
    try {
      await apiFetch("/api/newsletter", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatus("done");
    } catch (error) {
      setStatus("idle");
      toast.error(
        error instanceof ApiError ? error.message : t("error"),
      );
    }
  }

  if (status === "done") {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm text-success",
          className,
        )}
      >
        <Check className="size-4" /> {t("success")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("flex w-full max-w-md", className)}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("emailAria")}
        className="h-12 flex-1 border border-border border-r-0 bg-surface px-4 text-sm text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="flex h-12 items-center gap-2 bg-gold px-5 text-sm font-medium uppercase tracking-wide text-background transition-colors hover:bg-gold-light disabled:opacity-60"
      >
        {status === "loading" ? "..." : <>{t("subscribe")} <ArrowRight className="size-4" /></>}
      </button>
    </form>
  );
}
