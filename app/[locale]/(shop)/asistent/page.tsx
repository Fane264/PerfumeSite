import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { env } from "@/lib/env";
import { AssistantChat } from "@/components/shop/assistant/assistant-chat";

export const metadata: Metadata = {
  title: "Asistent AI | DecantLux — Recomandări personalizate de parfumuri",
  description:
    "Descrie ce cauți în limbaj natural și asistentul nostru AI, alimentat de Claude, îți recomandă parfumurile de nișă perfecte pentru tine.",
  alternates: { canonical: "/asistent" },
};

export default async function AssistantPage() {
  const available = Boolean(env.ANTHROPIC_API_KEY);
  const t = await getTranslations("assistant");

  return (
    <div className="container py-28 md:py-32">
      <header className="mb-10 max-w-2xl">
        <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-luxe text-gold">
          <Sparkles className="size-4" /> {t("eyebrow")}
        </p>
        <h1 className="font-serif text-4xl font-light text-cream md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {t("subtitle")}
        </p>
        {!available && (
          <p className="mt-4 border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
            {t("unavailableNotice")}
          </p>
        )}
      </header>

      <AssistantChat available={available} />
    </div>
  );
}
