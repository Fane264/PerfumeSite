"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import toast from "react-hot-toast";

/** Copies the public wishlist URL for the given user to the clipboard. */
export function WishlistShareButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/wishlist/${userId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiat în clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nu am putut copia linkul");
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-widest text-cream transition-colors hover:border-gold hover:text-gold"
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      Distribuie lista
    </button>
  );
}
