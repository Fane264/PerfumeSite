"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { RotateCcw, Home } from "lucide-react";

// Root error boundary. Catches errors thrown anywhere below the root layout
// (outside the (shop) segment) and reports them to Sentry.
export default function GlobalError({
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
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-6 text-center">
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
