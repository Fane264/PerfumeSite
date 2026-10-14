"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Cookie, X } from "lucide-react";

// ----------------------------------------------------------------------------
//  GDPR cookie consent (Phase 7). Preferences are stored in localStorage + a
//  1-year `gdpr_consent` cookie. Analytics/marketing scripts must read this
//  consent before loading — necessary cookies are always allowed.
// ----------------------------------------------------------------------------

const STORAGE_KEY = "gdpr_consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

interface Consent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

function persist(consent: Consent) {
  const value = JSON.stringify(consent);
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore storage failures (private mode)
  }
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(
    value,
  )}; max-age=${ONE_YEAR}; path=/; samesite=lax`;
  // Let other components react to a fresh consent decision.
  window.dispatchEvent(new CustomEvent("gdpr-consent", { detail: consent }));
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function decide(consent: Consent) {
    persist(consent);
    setVisible(false);
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-surface/95 backdrop-blur-md">
        <div className="container flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 size-5 shrink-0 text-gold" />
            <p className="text-sm text-muted-foreground">
              Folosim cookie-uri pentru a îmbunătăți experiența ta. Vezi{" "}
              <Link
                href="/legal/politica-confidentialitate"
                className="text-gold hover:underline"
              >
                Politica de Confidențialitate
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="border border-border px-4 py-2 text-xs uppercase tracking-widest text-cream transition-colors hover:border-gold"
            >
              Setări
            </button>
            <button
              type="button"
              onClick={() =>
                decide({ necessary: true, analytics: false, marketing: false })
              }
              className="border border-border px-4 py-2 text-xs uppercase tracking-widest text-cream transition-colors hover:border-gold"
            >
              Doar necesare
            </button>
            <button
              type="button"
              onClick={() =>
                decide({ necessary: true, analytics: true, marketing: true })
              }
              className="bg-gold px-4 py-2 text-xs font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
            >
              Acceptă toate
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md border border-border bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-xl text-cream">
                Setări cookie-uri
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Închide"
              >
                <X className="size-5 text-muted-foreground hover:text-cream" />
              </button>
            </div>

            <div className="space-y-4">
              <Toggle
                title="Necesare"
                description="Esențiale pentru funcționarea site-ului (coș, autentificare). Nu pot fi dezactivate."
                checked
                disabled
                onChange={() => undefined}
              />
              <Toggle
                title="Analitice"
                description="Ne ajută să înțelegem cum este folosit site-ul (statistici de trafic)."
                checked={analytics}
                onChange={setAnalytics}
              />
              <Toggle
                title="Marketing"
                description="Personalizarea căutării și a recomandărilor de produse."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                decide({ necessary: true, analytics, marketing });
                setShowSettings(false);
              }}
              className="mt-6 w-full bg-gold py-3 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
            >
              Salvează preferințele
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Toggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 accent-[#C9A84C] disabled:opacity-60"
      />
      <span>
        <span className="block text-sm text-cream">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}
