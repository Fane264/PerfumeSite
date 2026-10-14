"use client";

import { useState } from "react";
import { Check, Link2, Facebook, Twitter, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { APP_URL } from "@/lib/constants";

/** Social + copy-link sharing for a blog post. */
export function ShareButtons({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${APP_URL}/blog/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiat");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nu am putut copia linkul");
    }
  }

  const links = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Twitter,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: MessageCircle,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-xs uppercase tracking-widest text-muted-foreground">
        Distribuie
      </span>
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copiază linkul"
        className="flex size-9 items-center justify-center rounded-full border border-border text-cream transition-colors hover:border-gold hover:text-gold"
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </button>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Distribuie pe ${link.label}`}
          className="flex size-9 items-center justify-center rounded-full border border-border text-cream transition-colors hover:border-gold hover:text-gold"
        >
          <link.icon className="size-4" />
        </a>
      ))}
    </div>
  );
}
