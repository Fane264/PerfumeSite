"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowUp, ArrowDown, Trash2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import {
  adminVideosApi,
  ApiError,
  type ProductVideoDto,
} from "@/lib/api-client";
import {
  CloudinaryVideoUpload,
  type UploadedVideo,
} from "@/components/admin/cloudinary-video-upload";
import { Input } from "@/components/ui/input";

export function VideoManager({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<UploadedVideo | null>(null);
  const [title, setTitle] = useState("");

  const key = ["admin", "videos", slug];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => adminVideosApi.list(slug),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const onError = (e: unknown) =>
    toast.error(e instanceof ApiError ? e.message : "Operațiunea a eșuat");

  const create = useMutation({
    mutationFn: () =>
      adminVideosApi.create(slug, {
        url: pending!.url,
        thumbnailUrl: pending!.thumbnailUrl,
        duration: pending!.duration,
        title: title.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Videoclip adăugat");
      setPending(null);
      setTitle("");
      invalidate();
    },
    onError,
  });

  const toggle = useMutation({
    mutationFn: (v: ProductVideoDto) =>
      adminVideosApi.update(slug, v.id, { isActive: !v.isActive }),
    onSuccess: invalidate,
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminVideosApi.remove(slug, id),
    onSuccess: () => {
      toast.success("Videoclip șters");
      invalidate();
    },
    onError,
  });

  const reorder = useMutation({
    mutationFn: (order: string[]) => adminVideosApi.reorder(slug, order),
    onSuccess: invalidate,
    onError,
  });

  function move(index: number, dir: -1 | 1) {
    if (!data) return;
    const next = [...data];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate(next.map((v) => v.id));
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 font-medium">Adaugă videoclip</h2>
        <CloudinaryVideoUpload value={pending} onChange={setPending} />
        {pending && (
          <div className="mt-3 flex gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titlu (opțional)"
            />
            <button
              type="button"
              disabled={create.isPending}
              onClick={() => create.mutate()}
              className="shrink-0 rounded-md bg-primary px-4 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Salvează"
              )}
            </button>
          </div>
        )}
      </section>

      {data && data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((v, i) => (
            <li
              key={v.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              <video
                src={v.url}
                poster={v.thumbnailUrl ?? undefined}
                className="aspect-video w-32 shrink-0 rounded bg-black object-cover"
                muted
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {v.title ?? "Fără titlu"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {v.duration ? `${v.duration}s · ` : ""}
                  poziția {v.position + 1}
                  {!v.isActive && " · ascuns"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="Mută sus"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === data.length - 1}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="Mută jos"
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggle.mutate(v)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                  aria-label={v.isActive ? "Ascunde" : "Afișează"}
                >
                  {v.isActive ? (
                    <Eye className="size-4" />
                  ) : (
                    <EyeOff className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Ștergi acest videoclip?")) remove.mutate(v.id);
                  }}
                  className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                  aria-label="Șterge"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Niciun videoclip încă.
        </p>
      )}
    </div>
  );
}
