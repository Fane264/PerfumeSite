"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
//  Minimal typings for the Cloudinary upload widget global.
// ---------------------------------------------------------------------------
interface CloudinaryWidgetResult {
  event?: string;
  info?: { secure_url?: string };
}
interface CloudinaryWidget {
  open: () => void;
}
interface CloudinaryGlobal {
  createUploadWidget: (
    options: Record<string, unknown>,
    callback: (error: unknown, result: CloudinaryWidgetResult) => void,
  ) => CloudinaryWidget;
}
declare global {
  interface Window {
    cloudinary?: CloudinaryGlobal;
  }
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

interface CloudinaryUploadProps {
  /** Current ordered list of image URLs (first = primary). */
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  max?: number;
}

/**
 * Unsigned Cloudinary upload widget with a sortable preview grid. The first
 * image is treated as primary. Images can be reordered by drag-and-drop and
 * removed. Falls back to a manual URL input when the widget is unconfigured.
 */
export function CloudinaryUpload({
  value,
  onChange,
  folder,
  max = 8,
}: CloudinaryUploadProps) {
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const dragIndex = useRef<number | null>(null);

  const configured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

  const addUrl = useCallback(
    (url: string) => {
      if (!url) return;
      onChange([...value, url].slice(0, max));
    },
    [value, onChange, max],
  );

  const openWidget = useCallback(() => {
    if (!window.cloudinary || !configured) {
      toast.error("Widgetul Cloudinary nu este configurat");
      return;
    }
    setOpening(true);
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        folder,
        multiple: true,
        maxFiles: max - value.length,
        sources: ["local", "url", "camera"],
        styles: {
          palette: {
            window: "#111111",
            sourceBg: "#1A1A1A",
            windowBorder: "#2A2A2A",
            tabIcon: "#C9A84C",
            inactiveTabIcon: "#9A9088",
            menuIcons: "#C9A84C",
            link: "#C9A84C",
            action: "#C9A84C",
            textDark: "#0A0A0A",
            textLight: "#F5F0E8",
          },
        },
      },
      (error, result) => {
        if (error) {
          toast.error("Încărcarea a eșuat");
          setOpening(false);
          return;
        }
        if (result.event === "success" && result.info?.secure_url) {
          addUrl(result.info.secure_url);
        }
        if (result.event === "close" || result.event === "abort") {
          setOpening(false);
        }
      },
    );
    widget.open();
  }, [configured, folder, max, value.length, addUrl]);

  // Keep `opening` from sticking if the script-ready flag flips late.
  useEffect(() => {
    if (window.cloudinary) setReady(true);
  }, []);

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function onDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    if (moved === undefined) return;
    next.splice(targetIndex, 0, moved);
    onChange(next);
  }

  return (
    <div>
      {configured && (
        <Script
          src="https://widget.cloudinary.com/v2.0/global/all.js"
          strategy="lazyOnload"
          onLoad={() => setReady(true)}
        />
      )}

      {value.length > 0 && (
        <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((url, index) => (
            <li
              key={`${url}-${index}`}
              draggable
              onDragStart={() => (dragIndex.current = index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(index)}
              className="group relative aspect-square cursor-move overflow-hidden rounded-md border border-border bg-surface2"
            >
              <Image
                src={url}
                alt={`Imagine ${index + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-sm bg-gold px-1.5 py-0.5 text-[10px] font-medium text-background">
                  <Star className="size-3" /> Principală
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label="Elimină imaginea"
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/80 text-cream opacity-0 transition-opacity hover:bg-destructive hover:text-white group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length < max &&
        (configured ? (
          <button
            type="button"
            onClick={openWidget}
            disabled={opening || !ready}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
          >
            {opening ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            Încarcă imagine
          </button>
        ) : (
          // Fallback: paste a URL directly when the widget isn't configured.
          <div className="flex gap-2">
            <input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/…"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-gold focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                addUrl(manualUrl.trim());
                setManualUrl("");
              }}
              className="shrink-0 rounded-md border border-gold px-4 text-sm text-gold hover:bg-gold hover:text-background"
            >
              Adaugă
            </button>
          </div>
        ))}

      <p className="mt-2 text-xs text-muted-foreground">
        {configured
          ? "Trage imaginile pentru a le reordona. Prima imagine este cea principală."
          : "Setează NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET pentru încărcare directă; momentan adaugă URL-uri manual."}
      </p>
    </div>
  );
}
