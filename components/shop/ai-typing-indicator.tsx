"use client";

import { motion } from "framer-motion";

/** Three gold dots with a staggered bounce — shown while the AI is responding. */
export function AITypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="Asistentul scrie">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-2 rounded-full bg-gold"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.18,
          }}
        />
      ))}
    </div>
  );
}
