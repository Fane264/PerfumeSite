"use client";

import { Suspense, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ordersApi } from "@/lib/api-client";

function SuccessInner() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: ordersApi.list,
  });
  const order = orders?.[0];

  useEffect(() => {
    let cancelled = false;
    // Lazy-load the confetti bundle so it never ships with the initial JS.
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const end = Date.now() + 1500;
      const colors = ["#C9A84C", "#E8C97A", "#F5F0E8"];
      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container max-w-2xl py-28 text-center md:py-32">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="size-8" />
      </div>
      <p className="text-xs uppercase tracking-luxe text-gold">
        Comandă confirmată
      </p>
      <h1 className="mt-3 font-serif text-4xl font-light text-cream md:text-5xl">
        Îți mulțumim!
      </h1>
      <p className="mt-4 text-muted-foreground">
        Comanda ta a fost plasată cu succes. Vei primi un email de confirmare în
        scurt timp.
      </p>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-gold" />
        </div>
      ) : order ? (
        <div className="mt-10 border border-border bg-surface p-8 text-left">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Număr comandă
              </p>
              <p className="font-serif text-xl text-cream">{order.orderNumber}</p>
            </div>
            <Package className="size-6 text-gold" />
          </div>

          <ul className="divide-y divide-border py-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-2.5 text-sm">
                <span className="text-cream">
                  {item.perfumeName}{" "}
                  <span className="text-muted-foreground">
                    · {item.sizeML} ml × {item.quantity}
                  </span>
                </span>
                <span className="text-cream">
                  {formatPrice(item.lineTotal, order.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between border-t border-border pt-4 font-serif text-lg">
            <span className="text-cream">Total</span>
            <span className="text-gold">
              {formatPrice(order.total, order.currency)}
            </span>
          </div>

          <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            <p className="mb-1 text-xs uppercase tracking-wide">Livrare către</p>
            <p className="text-cream">{order.shippingAddress.name}</p>
            <p>
              {order.shippingAddress.line1}, {order.shippingAddress.city},{" "}
              {order.shippingAddress.county}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
        <Link
          href="/cont/comenzi"
          className="border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Urmărește comanda
        </Link>
        <Link
          href="/parfumuri"
          className="bg-gold px-7 py-3 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
        >
          Continuă cumpărăturile
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container flex justify-center py-40">
          <Loader2 className="size-7 animate-spin text-gold" />
        </div>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
