"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 70;

/**
 * Subtle pull-to-refresh hint for mobile catalog views. No external library:
 * tracks touch drag while scrolled to the top, reveals a hint, and on release
 * past the threshold refreshes the route. Hidden from `sm` up.
 */
export function PullToRefreshHint() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY <= 0 && !refreshing) {
        startY.current = e.touches[0]?.clientY ?? null;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (startY.current === null) return;
      const delta = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (delta > 0 && window.scrollY <= 0) {
        // Damped translation for a natural rubber-band feel.
        setPull(Math.min(THRESHOLD + 20, delta * 0.45));
      }
    }
    function onTouchEnd() {
      if (startY.current === null) return;
      if (pull >= THRESHOLD) {
        setRefreshing(true);
        router.refresh();
        window.setTimeout(() => setRefreshing(false), 800);
      }
      setPull(0);
      startY.current = null;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing, router]);

  const visible = pull > 0 || refreshing;

  return (
    <div
      aria-hidden={!visible}
      className="flex items-center justify-center overflow-hidden text-xs text-muted-foreground transition-[height] sm:hidden"
      style={{ height: refreshing ? 36 : Math.min(pull, THRESHOLD + 20) }}
    >
      <span className="flex items-center gap-2">
        {refreshing ? (
          <>
            <Loader2 className="size-4 animate-spin text-gold" />
            Se reîncarcă…
          </>
        ) : (
          <>
            <ArrowDown
              className={cn(
                "size-4 text-gold transition-transform",
                pull >= THRESHOLD && "rotate-180",
              )}
            />
            {pull >= THRESHOLD
              ? "Eliberează pentru a reîncărca"
              : "Trage în jos pentru a reîncărca"}
          </>
        )}
      </span>
    </div>
  );
}
