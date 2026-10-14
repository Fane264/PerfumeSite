"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";
import type { ApiProductVideo } from "@/types";

interface ProductVideoGalleryProps {
  videos: ApiProductVideo[];
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Video tab for the product gallery: a grid of thumbnails (hover-preview), each
 * opening a modal HTML5 player. Cloudinary delivers adaptive streaming via
 * `f_auto,q_auto`.
 */
export function ProductVideoGallery({ videos }: ProductVideoGalleryProps) {
  const [active, setActive] = useState<ApiProductVideo | null>(null);

  if (videos.length === 0) return null;

  return (
    <div data-testid="product-video-gallery">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {videos.map((video) => {
          const duration = formatDuration(video.duration);
          return (
            <button
              key={video.id}
              type="button"
              onClick={() => setActive(video)}
              className="group relative aspect-video overflow-hidden rounded-md border border-border bg-black"
            >
              {video.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnailUrl}
                  alt={video.title ?? "Videoclip"}
                  className="size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                />
              ) : (
                <video
                  src={video.url}
                  muted
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                  onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
              )}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-background/70 text-gold transition-transform group-hover:scale-110">
                  <Play className="size-5 translate-x-0.5" />
                </span>
              </span>
              {duration && (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-background/80 px-1.5 py-0.5 text-[11px] text-cream">
                  {duration}
                </span>
              )}
              {video.title && (
                <span className="absolute bottom-1.5 left-1.5 max-w-[70%] truncate text-left text-[11px] text-cream">
                  {video.title}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Închide"
              className="absolute -top-10 right-0 flex size-9 items-center justify-center rounded-full bg-surface text-cream hover:text-gold"
            >
              <X className="size-5" />
            </button>
            <video
              src={active.url}
              poster={active.thumbnailUrl ?? undefined}
              controls
              autoPlay
              className="aspect-video w-full rounded-md bg-black"
            />
            {active.title && (
              <p className="mt-3 text-center text-sm text-cream">{active.title}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
