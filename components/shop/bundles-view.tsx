"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/motion";
import { BundleCard } from "@/components/shop/BundleCard";
import { BundleModal } from "@/components/shop/BundleModal";
import type { BundleDto } from "@/lib/api-client";

export function BundlesView({ bundles }: { bundles: BundleDto[] }) {
  const [active, setActive] = useState<BundleDto | null>(null);
  const t = useTranslations("sets");

  if (bundles.length === 0) {
    return (
      <p className="border border-dashed border-border py-20 text-center text-muted-foreground">
        {t("empty")}
      </p>
    );
  }

  return (
    <>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {bundles.map((bundle) => (
          <BundleCard key={bundle.id} bundle={bundle} onDetails={setActive} />
        ))}
      </motion.div>

      <BundleModal bundle={active} onClose={() => setActive(null)} />
    </>
  );
}
