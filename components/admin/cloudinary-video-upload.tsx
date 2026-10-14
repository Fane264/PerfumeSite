"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { Loader2, Video, X } from "lucide-react";
import toast from "react-hot-toast";

interface CloudinaryVideoInfo {
  secure_url?: string;
  duration?: number;
  thumbnail_url?: string;
  resource_type?: string;
}
interface CloudinaryVideoResult {
  event?: string;
  info?: CloudinaryVideoInfo;
}
interface VideoWidget {
  open: () => void;
}
interface VideoWidgetGlobal {
  createUploadWidget: (
    options: Record<string, unknown>,
    callback: (error: unknown, result: CloudinaryVideoResult) => void,
  ) => VideoWidget;
}

// The `Window.cloudinary` global is declared once (in cloudinary-upload.tsx);
// here we access it through a local cast to the video-aware widget shape.
function getWidgetGlobal(): VideoWidgetGlobal | undefined {
  return (window as unknown as { cloudinary?: VideoWidgetGlobal }).cloudinary;
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export interface UploadedVideo {
  url: string;
  thumbnailUrl?: string;
  duration?: number;
}

interface CloudinaryVideoUploadProps {
  value: UploadedVideo | null;
  onChange: (video: UploadedVideo | null) => void;
  /** Max duration in seconds enforced after upload (default 600). */
  maxDuration?: number;
  label?: string;
}

/**
 * Single-video Cloudinary upload (resource_type: video). Mirrors the image
 * widget but for MP4/MOV/WebM, surfacing the auto-generated poster + duration.
 * Falls back to a manual URL input when the widget is unconfigured.
 */
export function CloudinaryVideoUpload({
  value,
  onChange,
  maxDuration = 600,
  label = "Încarcă videoclip",
}: CloudinaryVideoUploadProps) {
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  const configured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

  useEffect(() => {
    if (getWidgetGlobal()) setReady(true);
  }, []);

  const openWidget = useCallback(() => {
    const cloud = getWidgetGlobal();
    if (!cloud || !configured) {
      toast.error("Widgetul Cloudinary nu este configurat");
      return;
    }
    setOpening(true);
    const widget = cloud.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        folder: "perfume-site/videos",
        resourceType: "video",
        multiple: false,
        maxFileSize: 100_000_000, // 100 MB
        clientAllowedFormats: ["mp4", "mov", "webm"],
        sources: ["local", "url"],
      },
      (error, result) => {
        if (error) {
          toast.error("Încărcarea a eșuat");
          setOpening(false);
          return;
        }
        if (result.event === "success" && result.info?.secure_url) {
          const duration = result.info.duration;
          if (duration && duration > maxDuration) {
            toast.error(`Videoclipul depășește ${maxDuration} secunde`);
            return;
          }
          onChange({
            url: result.info.secure_url,
            thumbnailUrl: result.info.thumbnail_url,
            duration: duration ? Math.round(duration) : undefined,
          });
          toast.success("Videoclip încărcat");
        }
        if (result.event === "close" || result.event === "abort") {
          setOpening(false);
        }
      },
    );
    widget.open();
  }, [configured, maxDuration, onChange]);

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-md border border-border bg-surface2">
        <video
          src={value.url}
          poster={value.thumbnailUrl}
          controls
          className="aspect-video w-full bg-black"
        />
        <div className="flex items-center justify-between p-2 text-xs text-muted-foreground">
          <span>
            {value.duration ? `${value.duration}s` : "Videoclip"}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-destructive hover:underline"
          >
            <X className="size-3.5" /> Elimină
          </button>
        </div>
      </div>
    );
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
      {configured ? (
        <button
          type="button"
          onClick={openWidget}
          disabled={opening || !ready}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
        >
          {opening ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Video className="size-5" />
          )}
          {label}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/…/video.mp4"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-gold focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (manualUrl.trim()) {
                onChange({ url: manualUrl.trim() });
                setManualUrl("");
              }
            }}
            className="shrink-0 rounded-md border border-gold px-4 text-sm text-gold hover:bg-gold hover:text-background"
          >
            Adaugă
          </button>
        </div>
      )}
    </div>
  );
}
