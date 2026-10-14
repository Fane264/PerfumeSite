"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";
import { familyBadgeClass } from "@/lib/family";
import { cn } from "@/lib/utils";
import type { OlfactoryPyramid as Pyramid, ApiNoteRef } from "@/types";

const TIERS: { key: keyof Pyramid; label: string }[] = [
  { key: "top", label: "Vârf" },
  { key: "heart", label: "Inimă" },
  { key: "base", label: "Bază" },
];

function NoteChip({ note }: { note: ApiNoteRef }) {
  return (
    <motion.span
      variants={fadeUp}
      className={cn(
        "inline-flex items-center rounded-sm border px-3 py-1 text-xs",
        familyBadgeClass(note.family.toLowerCase()),
      )}
    >
      {note.name}
    </motion.span>
  );
}

export function OlfactoryPyramid({ pyramid }: { pyramid: Pyramid }) {
  const hasNotes =
    pyramid.top.length + pyramid.heart.length + pyramid.base.length > 0;
  if (!hasNotes) return null;

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={viewportOnce}
      className="space-y-6"
    >
      {TIERS.map(({ key, label }) => {
        const notes = pyramid[key];
        if (notes.length === 0) return null;
        return (
          <div
            key={key}
            className="border-l border-gold/30 pl-5"
            style={{
              marginLeft: key === "heart" ? 16 : key === "base" ? 32 : 0,
            }}
          >
            <p className="mb-2.5 text-xs uppercase tracking-luxe text-muted-foreground">
              {label}
            </p>
            <div className="flex flex-wrap gap-2">
              {notes.map((note) => (
                <NoteChip key={note.id} note={note} />
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
