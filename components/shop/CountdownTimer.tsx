"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  endsAt: Date | string;
  size?: "sm" | "lg";
  onExpire?: () => void;
  className?: string;
}

function diffParts(target: number) {
  const total = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(total / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { total, hours, minutes, seconds };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Live countdown to `endsAt`. Rendered entirely client-side (mounts to `null`
 * first) to avoid SSR hydration mismatches. Turns amber under an hour and red +
 * pulsing under ten minutes; on reaching zero it refreshes the route and fires
 * `onExpire`.
 */
export function CountdownTimer({
  endsAt,
  size = "sm",
  onExpire,
  className,
}: CountdownTimerProps) {
  const target = new Date(endsAt).getTime();
  const [mounted, setMounted] = useState(false);
  const [parts, setParts] = useState(() => diffParts(target));
  const router = useRouter();
  const firedExpire = useRef(false);

  useEffect(() => {
    setMounted(true);
    setParts(diffParts(target));

    const id = setInterval(() => {
      const next = diffParts(target);
      setParts(next);
      if (next.total <= 0 && !firedExpire.current) {
        firedExpire.current = true;
        clearInterval(id);
        onExpire?.();
        router.refresh();
      }
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Avoid rendering server-side time (hydration safety).
  if (!mounted) {
    return (
      <span
        className={cn(
          "font-mono tabular-nums text-gold",
          size === "lg" ? "text-2xl" : "text-sm",
          className,
        )}
      >
        --h --m --s
      </span>
    );
  }

  const urgent = parts.total <= 10 * 60 * 1000;
  const soon = parts.total <= 60 * 60 * 1000;

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        size === "lg" ? "text-2xl" : "text-sm",
        urgent ? "animate-pulse text-error" : soon ? "text-amber-400" : "text-gold",
        className,
      )}
      aria-live="polite"
      aria-label={`Timp rămas: ${parts.hours} ore ${parts.minutes} minute`}
    >
      {pad(parts.hours)}h {pad(parts.minutes)}m {pad(parts.seconds)}s
    </span>
  );
}
