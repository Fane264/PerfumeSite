"use client";

import { motion } from "framer-motion";
import { Search, CreditCard, Sparkles } from "lucide-react";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";
import { SectionHeading } from "@/components/shop/reveal";

const STEPS = [
  {
    icon: Search,
    title: "Alege",
    description: "Răsfoiește și selectează parfumul și mărimea decantului dorit.",
  },
  {
    icon: CreditCard,
    title: "Comandă",
    description: "Plată securizată prin Stripe și livrare rapidă în 24–48h.",
  },
  {
    icon: Sparkles,
    title: "Descoperă",
    description: "Primești decantul turnat manual, în ambalaj premium.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="container py-24">
      <SectionHeading
        eyebrow="Simplu și elegant"
        title="Cum funcționează"
        align="center"
      />
      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={viewportOnce}
        className="mt-16 grid gap-10 md:grid-cols-3"
      >
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            variants={fadeUp}
            className="relative flex flex-col items-center px-6 text-center"
          >
            <span className="pointer-events-none absolute -top-6 select-none font-serif text-8xl font-light text-gold/10">
              0{i + 1}
            </span>
            <span className="relative mb-5 flex size-14 items-center justify-center rounded-full border border-gold/40 text-gold">
              <step.icon className="size-6" />
            </span>
            <h3 className="font-serif text-2xl font-light text-cream">
              {step.title}
            </h3>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {step.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
