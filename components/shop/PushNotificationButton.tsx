"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Bell, BellRing, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch, ApiError } from "@/lib/api-client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Opt-in/out of browser push notifications. Gracefully hidden when the browser
 * lacks support or VAPID keys are not configured.
 */
export function PushNotificationButton({
  className,
}: {
  className?: string;
}) {
  const { isSignedIn } = useAuth();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      Boolean(VAPID_PUBLIC_KEY);
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => undefined);
  }, []);

  if (!supported || !isSignedIn) return null;

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permisiunea pentru notificări a fost refuzată");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY!,
        ) as BufferSource,
      });
      await apiFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setSubscribed(true);
      toast.success("Notificări activate");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Activarea a eșuat",
      );
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiFetch("/api/push/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notificări dezactivate");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Dezactivarea a eșuat",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={subscribed ? unsubscribe : subscribe}
      className={
        className ??
        "inline-flex items-center gap-2 border border-gold px-4 py-2 text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background disabled:opacity-50"
      }
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : subscribed ? (
        <BellRing className="size-4" />
      ) : (
        <Bell className="size-4" />
      )}
      {subscribed ? "Notificări active" : "Activează notificările"}
    </button>
  );
}
