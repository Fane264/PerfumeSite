"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

/** Celebratory banner shown when Stripe redirects back with ?success=1. */
export function OrderSuccessBanner() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // The order is created by the Stripe webhook; refresh once it lands.
    void queryClient.invalidateQueries({ queryKey: ["orders"] });

    let cancelled = false;
    // Lazy-load the confetti bundle so it never ships with the initial JS.
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const end = Date.now() + 1500;
      const colors = ["#C9A84C", "#E8C97A", "#F5F0E8"];
      (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  return (
    <div className="mb-8 flex items-center gap-3 border border-success/30 bg-success/10 px-5 py-4 text-success">
      <CheckCircle2 className="size-5 shrink-0" />
      <p className="text-sm">
        Plata a fost confirmată! Comanda ta apare mai jos imediat ce este
        procesată.
      </p>
    </div>
  );
}
