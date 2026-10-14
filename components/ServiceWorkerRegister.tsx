"use client";

import { useEffect } from "react";

/** Registers the push/PWA service worker, client-side only. Renders nothing. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[SW] registration failed:", err);
    });
  }, []);

  return null;
}
