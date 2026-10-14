"use client";

import { Link } from "@/i18n/navigation";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

/**
 * Homepage band linking signed-in members to their personalized "Pentru Tine"
 * selection. Renders nothing for signed-out visitors.
 */
export function PersonalizedTeaser() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded || !isSignedIn) return null;

  return (
    <section className="container py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="flex flex-col items-center justify-between gap-4 border border-gold/30 bg-gradient-to-r from-gold/5 to-transparent p-8 sm:flex-row"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-light text-cream">
              Selecția ta personalizată
            </h2>
            <p className="text-sm text-muted-foreground">
              Recomandări alese pe baza gusturilor tale.
            </p>
          </div>
        </div>
        <Link
          href="/pentru-tine"
          className="flex items-center gap-2 whitespace-nowrap border border-gold px-6 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Descoperă <ArrowRight className="size-4" />
        </Link>
      </motion.div>
    </section>
  );
}
