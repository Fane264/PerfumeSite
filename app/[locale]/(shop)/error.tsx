"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import * as Sentry from "@sentry/nextjs";
import { RotateCcw, Home } from "lucide-react";

// Error boundary for the storefront segment. Rendered inside the (shop) layout
// so the header/footer chrome stays in place.
export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-28 text-center md:py-32">
      <p className="text-xs uppercase tracking-luxe text-gold">Eroare</p>
      <h1 className="mt-3 font-serif text-4xl font-light text-cream md:text-5xl">
        Ceva nu a mers bine
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Echipa noastră a fost notificată. Încearcă să reîncarci pagina.
      </p>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="flex items-center justify-center gap-2 bg-gold px-7 py-3 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
        >
          <RotateCcw className="size-4" /> Reîncarcă
        </button>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          <Home className="size-4" /> Înapoi acasă
        </Link>
      </div>
    </div>
  );
}
