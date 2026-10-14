"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, X } from "lucide-react";
import { referralApi } from "@/lib/api-client";

const DISMISS_KEY = "referral_banner_dismissed";
const COOKIE_NAME = "referral_code";

/** Persist the referral code in a 30-day, client-readable cookie. */
function setReferralCookie(code: string) {
  const maxAge = 30 * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    code,
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Detects `?ref=CODE` on the homepage: validates the code, stores it in a cookie
 * for the eventual sign-up, and shows a dismissible welcome banner. Dismissal is
 * remembered for the session.
 */
export function ReferralBanner() {
  const searchParams = useSearchParams();
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const code = searchParams.get("ref");
    if (!code) return;
    if (sessionStorage.getItem(DISMISS_KEY) === code) return;

    let active = true;
    referralApi
      .validate(code)
      .then((res) => {
        if (!active || !res.valid) return;
        setReferralCookie(code.toUpperCase());
        setReferrerName(res.referrerName);
        setVisible(true);
      })
      .catch(() => {
        /* invalid code — silently ignore */
      });
    return () => {
      active = false;
    };
  }, [searchParams]);

  const dismiss = () => {
    const code = searchParams.get("ref");
    if (code) sessionStorage.setItem(DISMISS_KEY, code);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="relative z-40 border-b border-gold/30 bg-gold/10"
        >
          <div className="container flex items-center justify-center gap-3 py-2.5 text-center text-sm text-cream">
            <Gift className="size-4 shrink-0 text-gold" />
            <span>
              {referrerName ? `${referrerName} te-a invitat! ` : "Ai fost invitat! "}
              Înregistrează-te și primești{" "}
              <span className="font-medium text-gold">50 de puncte bonus</span>.
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Închide"
              className="absolute right-4 text-muted-foreground transition-colors hover:text-cream"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
