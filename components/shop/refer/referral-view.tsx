"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import {
  Loader2,
  Copy,
  Check,
  Gift,
  UserPlus,
  ShoppingBag,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { referralApi } from "@/lib/api-client";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Copy,
    title: "Trimite linkul",
    text: "Distribuie linkul tău personal de invitație prietenilor.",
  },
  {
    icon: UserPlus,
    title: "Ei se înregistrează",
    text: "Prietenul tău primește 50 de puncte bonus la înscriere.",
  },
  {
    icon: ShoppingBag,
    title: "Câștigați amândoi",
    text: "La prima lor comandă, primești 100 de puncte.",
  },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "În așteptare",
  REGISTERED: "Înregistrat",
  COMPLETED: "Finalizat",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-surface2 text-muted-foreground border-border",
  REGISTERED: "bg-amber-950/50 text-amber-300 border-amber-800/50",
  COMPLETED: "bg-emerald-950/50 text-emerald-300 border-emerald-800/50",
};

export function ReferralView() {
  const { data, isLoading } = useQuery({
    queryKey: ["referral"],
    queryFn: referralApi.get,
  });
  const [copied, setCopied] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  const shareText = `Descoperă parfumuri de nișă în decanturi pe DÉCANT și primește 50 de puncte bonus: ${data.link}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const email = `mailto:?subject=${encodeURIComponent(
    "Te invit pe DÉCANT",
  )}&body=${encodeURIComponent(shareText)}`;

  return (
    <div className="container py-28 md:py-32">
      <div className="mb-12 text-center">
        <p className="text-xs uppercase tracking-luxe text-gold">Program de recomandare</p>
        <h1 className="mt-3 font-serif text-4xl font-light text-gold md:text-6xl">
          Invită prietenii, câștigați amândoi
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Tu primești 100 de puncte, prietenul tău 50. Fără limită.
        </p>
      </div>

      {/* How it works */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="mb-14 grid gap-6 md:grid-cols-3"
      >
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            variants={fadeUp}
            className="border border-border bg-surface p-6 text-center"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-gold/40 text-gold">
              <step.icon className="size-5" />
            </div>
            <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
              Pasul {i + 1}
            </p>
            <h3 className="mt-1 font-serif text-xl text-cream">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Share */}
        <div className="border border-border bg-surface p-8">
          <h2 className="font-serif text-2xl font-light text-cream">
            Linkul tău de invitație
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 truncate border border-border bg-background px-4 py-3 font-mono text-sm text-gold">
              {data.link}
            </div>
            <Button
              variant="gold"
              onClick={() => {
                void navigator.clipboard.writeText(data.link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copiat" : "Copiază"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-border px-4 py-2.5 text-sm text-cream transition-colors hover:border-gold hover:text-gold"
            >
              <Gift className="size-4" /> WhatsApp
            </a>
            <a
              href={email}
              className="flex items-center gap-2 border border-border px-4 py-2.5 text-sm text-cream transition-colors hover:border-gold hover:text-gold"
            >
              <Mail className="size-4" /> Email
            </a>
          </div>

          <div className="mt-8 flex items-center gap-6 border-t border-border pt-6">
            <Stat value={data.stats.invited} label="Prieteni invitați" />
            <Stat value={data.stats.completed} label="Recompense câștigate" />
            <Stat value={data.stats.pointsEarned} label="Puncte din recomandări" />
          </div>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center justify-center border border-border bg-surface p-8">
          <div className="rounded-md bg-white p-4">
            <QRCode value={data.link} size={160} />
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Scanează pentru a deschide linkul de invitație
          </p>
        </div>
      </div>

      {/* Friends list */}
      <div className="mt-6">
        <h2 className="mb-4 font-serif text-2xl font-light text-cream">
          Prietenii tăi
        </h2>
        {data.friends.length === 0 ? (
          <p className="border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Niciun prieten invitat încă. Distribuie linkul de mai sus.
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border bg-surface">
            {data.friends.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm text-cream">{f.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(f.createdAt).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-sm border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                    STATUS_CLASS[f.status],
                  )}
                >
                  {STATUS_LABEL[f.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-3xl font-light text-gold">
        {value.toLocaleString("ro-RO")}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
