"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, X, Mail, Save, Search } from "lucide-react";
import toast from "react-hot-toast";
import {
  adminVariantsApi,
  adminBoxCurationApi,
  ApiError,
  type BoxCurationItem,
} from "@/lib/api-client";
import { Input } from "@/components/ui/input";

function nextMonths(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
  }).format(new Date(y!, (m ?? 1) - 1, 1));
}

const MAX_ITEMS = 8;

export function BoxCurationView() {
  const months = useMemo(() => nextMonths(6), []);
  const [month, setMonth] = useState(months[0]!);
  const [query, setQuery] = useState("");
  const [contents, setContents] = useState<BoxCurationItem[]>([]);
  const [curatorNote, setCuratorNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Load existing curation for the selected month.
  const { data: saved, isLoading: loadingSaved } = useQuery({
    queryKey: ["admin", "box-curation", month],
    queryFn: () => adminBoxCurationApi.get(month),
  });

  useEffect(() => {
    if (saved) {
      setContents(saved.contents);
      setCuratorNote(saved.curatorNote);
    }
  }, [saved]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["admin", "variant-search", query],
    queryFn: () => adminVariantsApi.search(query),
    enabled: query.trim().length >= 2,
  });

  function add(v: {
    id: string;
    sizeML: number;
    perfumeName: string;
    houseName: string;
  }) {
    if (contents.length >= MAX_ITEMS) {
      toast.error(`Maxim ${MAX_ITEMS} decanturi per cutie`);
      return;
    }
    if (contents.some((c) => c.variantId === v.id)) return;
    setContents([
      ...contents,
      {
        variantId: v.id,
        sizeML: v.sizeML,
        perfumeName: v.perfumeName,
        houseName: v.houseName,
      },
    ]);
  }

  function removeItem(variantId: string) {
    setContents(contents.filter((c) => c.variantId !== variantId));
  }

  async function save(markCurating: boolean) {
    setBusy(true);
    try {
      const res = await adminBoxCurationApi.save({
        month,
        contents,
        curatorNote: curatorNote.trim() || undefined,
        markCurating,
      });
      toast.success(`${res.updated ?? 0} cutii actualizate.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Salvarea a eșuat");
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    setBusy(true);
    try {
      const res = await adminBoxCurationApi.save({
        month,
        contents,
        curatorNote: curatorNote.trim() || undefined,
        previewEmail: true,
      });
      toast.success(`Preview trimis la ${res.to}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Trimiterea a eșuat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Lună:</label>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        {saved && (
          <span className="text-sm text-muted-foreground">
            {saved.boxCount} cutii în această lună
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left — catalog selector */}
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 font-medium">Selector parfumuri</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută după nume, casă sau SKU…"
              className="pl-9"
            />
          </div>

          <div className="mt-3 max-h-96 space-y-1 overflow-y-auto">
            {isFetching && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto size-4 animate-spin" />
              </p>
            )}
            {query.trim().length < 2 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Scrie minim 2 caractere pentru a căuta.
              </p>
            )}
            {results?.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => add(v)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span>
                  <span className="font-medium">{v.perfumeName}</span>{" "}
                  <span className="text-muted-foreground">
                    · {v.houseName} · {v.sizeML} ml
                  </span>
                </span>
                <Plus className="size-4 text-primary" />
              </button>
            ))}
          </div>
        </section>

        {/* Right — current box */}
        <section className="rounded-lg border border-border p-4">
          <h2 className="font-medium">
            Cutia · {monthLabel(month)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {contents.length}/{MAX_ITEMS} decanturi adăugate
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(contents.length / MAX_ITEMS) * 100}%` }}
            />
          </div>

          {loadingSaved ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {contents.map((c) => (
                <li
                  key={c.variantId}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{c.perfumeName}</span>{" "}
                    <span className="text-muted-foreground">
                      · {c.houseName} · {c.sizeML} ml
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(c.variantId)}
                    className="text-destructive hover:opacity-80"
                    aria-label="Elimină"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
              {contents.length === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">
                  Adaugă parfumuri din selectorul din stânga.
                </li>
              )}
            </ul>
          )}

          <label className="mt-4 block text-sm text-muted-foreground">
            Notă curator
          </label>
          <textarea
            value={curatorNote}
            onChange={(e) => setCuratorNote(e.target.value)}
            rows={3}
            placeholder="Un mesaj personal inclus în cutie…"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => save(false)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Save className="size-4" /> Salvează selecția
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => save(true)}
              className="rounded-md border border-primary px-4 py-2 text-sm text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              Marchează ca pregătite
            </button>
            <button
              type="button"
              disabled={busy || contents.length === 0}
              onClick={preview}
              className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              <Mail className="size-4" /> Previzualizează email
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
