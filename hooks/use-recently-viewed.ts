"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "recently-viewed";
const MAX_ITEMS = 8;
const EVENT = "recently-viewed:change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

function write(slugs: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

/** Append a slug to the recently-viewed list (most-recent first, deduped). */
export function addToRecentlyViewed(slug: string) {
  if (typeof window === "undefined" || !slug) return;
  const current = read().filter((s) => s !== slug);
  write([slug, ...current].slice(0, MAX_ITEMS));
}

/**
 * Reactive list of recently-viewed slugs. Stays in sync across components and
 * tabs via a custom event + the native `storage` event.
 */
export function useRecentlyViewed() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setSlugs(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const clear = useCallback(() => write([]), []);

  return { slugs, clear };
}

/** Track a product view; call once on the detail page with the perfume slug. */
export function useTrackRecentlyViewed(slug: string) {
  useEffect(() => {
    addToRecentlyViewed(slug);
  }, [slug]);
}
