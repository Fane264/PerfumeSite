"use client";

import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { fadeUp, staggerFast, viewportOnce } from "@/lib/motion";
import { SectionHeading } from "@/components/shop/reveal";
import { FAMILY_FALLBACK } from "@/lib/family";

export interface WheelFamily {
  name: string;
  slug: string;
  colorHex?: string;
}

export function OlfactoryWheelSection({ families }: { families?: WheelFamily[] }) {
  const t = useTranslations("home");
  const list: WheelFamily[] =
    families && families.length > 0 ? families : FAMILY_FALLBACK;

  return (
    <section className="container py-24">
      <SectionHeading
        eyebrow={t("familyEyebrow")}
        title={t("familyTitle")}
        align="center"
      />
      <motion.div
        variants={staggerFast}
        initial="initial"
        whileInView="animate"
        viewport={viewportOnce}
        className="mt-12 flex flex-wrap justify-center gap-3"
      >
        {list.map((family) => (
          <motion.div key={family.slug} variants={fadeUp}>
            <Link
              href={`/parfumuri?family=${family.slug}`}
              className="group flex items-center gap-2.5 rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-cream transition-colors hover:border-gold"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: family.colorHex ?? "#C9A84C" }}
              />
              <span className="transition-colors group-hover:text-gold">
                {family.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
