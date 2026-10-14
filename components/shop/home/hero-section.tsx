"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";

export function HeroSection() {
  const t = useTranslations("hero");
  return (
    <section className="relative flex h-[100svh] min-h-[640px] items-center justify-center overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1920&auto=format&fit=crop"
        alt=""
        fill
        priority
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        sizes="100vw"
        className="object-cover brightness-[0.35]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="container relative z-10 flex flex-col items-center text-center"
      >
        <motion.p
          variants={fadeUp}
          className="mb-5 text-sm uppercase tracking-luxe text-gold"
        >
          {t("eyebrow")}
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="max-w-4xl font-serif text-5xl font-light leading-[1.05] text-cream md:text-7xl lg:text-8xl"
        >
          {t("title")}
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-xl text-lg text-muted-foreground"
        >
          {t("subtitle")}
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            href="/parfumuri"
            className="flex h-12 items-center justify-center bg-gold px-8 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href="/quiz"
            className="flex h-12 items-center justify-center border border-cream/30 px-8 text-sm font-medium uppercase tracking-widest text-cream transition-colors hover:border-gold hover:text-gold"
          >
            {t("ctaSecondary")}
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-gold"
        aria-hidden
      >
        <ChevronDown className="size-6 animate-bounce-soft" />
      </motion.div>
    </section>
  );
}
