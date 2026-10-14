"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Eye, Flame, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface PerfumeStats {
  orderedThisMonth: number;
  viewersNow: number;
  lastOrderedAt: string | null;
}

/** Humanize a past ISO timestamp into Romanian relative time. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return "acum câteva minute";
  if (hours < 24) return `acum ${hours} ${hours === 1 ? "oră" : "ore"}`;
  const days = Math.floor(hours / 24);
  return `acum ${days} ${days === 1 ? "zi" : "zile"}`;
}

/** Subtle social-proof line shown beneath the price in the BuyBox. */
export function SocialProof({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["perfume-stats", slug],
    queryFn: () => apiFetch<PerfumeStats>(`/api/perfumes/${slug}/stats`),
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  const lines: { icon: typeof Eye; text: string }[] = [];
  if (data.orderedThisMonth > 0) {
    lines.push({
      icon: Flame,
      text: `${data.orderedThisMonth} ${
        data.orderedThisMonth === 1 ? "persoană a comandat" : "persoane au comandat"
      } asta luna aceasta`,
    });
  }
  lines.push({
    icon: Eye,
    text: `${data.viewersNow} persoane se uită acum`,
  });
  if (data.lastOrderedAt) {
    lines.push({
      icon: Clock,
      text: `Ultima comandă: ${relativeTime(data.lastOrderedAt)}`,
    });
  }

  return (
    <motion.ul
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.4 }}
      className="space-y-1.5 text-xs text-muted-foreground"
    >
      {lines.map((line, i) => (
        <li key={i} className="flex items-center gap-2">
          <line.icon className="size-3.5 text-gold/70" />
          <span>{line.text}</span>
        </li>
      ))}
    </motion.ul>
  );
}
