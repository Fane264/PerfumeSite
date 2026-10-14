"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch, ApiError } from "@/lib/api-client";
import { CLOUDINARY_PRODUCTS_FOLDER } from "@/lib/constants";
import { CloudinaryUpload } from "@/components/admin/cloudinary-upload";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

const GENDERS = [
  { value: "MASCULINE", label: "Masculin" },
  { value: "FEMININE", label: "Feminin" },
  { value: "UNISEX", label: "Unisex" },
];

const CONCENTRATIONS = [
  { value: "EDP", label: "Eau de Parfum" },
  { value: "EDT", label: "Eau de Toilette" },
  { value: "PARFUM", label: "Parfum" },
  { value: "EAU_DE_COLOGNE", label: "Eau de Cologne" },
  { value: "EXTRAIT", label: "Extrait de Parfum" },
];

type NotePosition = "TOP" | "HEART" | "BASE";

const NOTE_POSITIONS: { value: NotePosition; label: string }[] = [
  { value: "TOP", label: "Vârf" },
  { value: "HEART", label: "Inimă" },
  { value: "BASE", label: "Bază" },
];

interface VariantRow {
  sizeML: number;
  price: number;
  initialQuantity: number;
  lowStockThreshold: number;
}

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-gold focus:outline-none";
const labelClass =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

/** Local-only slugify mirroring lib/utils so admins can preview the slug. */
function slugifyPreview(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  houses,
  families,
  notes = [],
}: {
  houses: Option[];
  families: Option[];
  notes?: Option[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [story, setStory] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [storyEn, setStoryEn] = useState("");
  const [houseId, setHouseId] = useState(houses[0]?.id ?? "");
  const [familyId, setFamilyId] = useState(families[0]?.id ?? "");
  const [gender, setGender] = useState("UNISEX");
  const [concentration, setConcentration] = useState("EDP");
  const [launchYear, setLaunchYear] = useState("");
  const [perfumer, setPerfumer] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  const [variants, setVariants] = useState<VariantRow[]>([
    { sizeML: 5, price: 0, initialQuantity: 0, lowStockThreshold: 5 },
  ]);
  const [images, setImages] = useState<string[]>([]);
  // Map of noteId → assigned pyramid position.
  const [notePositions, setNotePositions] = useState<
    Record<string, NotePosition>
  >({});

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    setVariants((v) => v.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function setNotePosition(noteId: string, position: NotePosition | "") {
    setNotePositions((prev) => {
      const next = { ...prev };
      if (position === "") delete next[noteId];
      else next[noteId] = position;
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
        story: story || undefined,
        descriptionEn: descriptionEn || undefined,
        storyEn: storyEn || undefined,
        houseId,
        familyId,
        gender,
        concentration,
        launchYear: launchYear ? Number(launchYear) : undefined,
        perfumer: perfumer || undefined,
        isActive,
        isFeatured,
        variants: variants.map((v) => ({
          sizeML: Number(v.sizeML),
          price: Number(v.price),
          initialQuantity: Number(v.initialQuantity),
          lowStockThreshold: Number(v.lowStockThreshold),
        })),
        images: images.map((url, idx) => ({
          url,
          position: idx,
          isPrimary: idx === 0,
        })),
        notes: Object.entries(notePositions).map(([noteId, position]) => ({
          noteId,
          position,
        })),
      };
      await apiFetch("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Produs creat");
      router.push("/admin/produse");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Creare eșuată");
      setSubmitting(false);
    }
  }

  const slugPreview = name ? slugifyPreview(name) : "";

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Core */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-5 font-medium">Detalii produs</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nume</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
            {slugPreview && (
              <p className="mt-1 text-xs text-muted-foreground">
                Slug: <span className="text-gold">{slugPreview}</span>
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Casă</label>
            <select
              value={houseId}
              onChange={(e) => setHouseId(e.target.value)}
              className={inputClass}
              required
            >
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Familie olfactivă</label>
            <select
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className={inputClass}
              required
            >
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Gen</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={inputClass}
            >
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Concentrație</label>
            <select
              value={concentration}
              onChange={(e) => setConcentration(e.target.value)}
              className={inputClass}
            >
              {CONCENTRATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>An lansare</label>
            <input
              type="number"
              value={launchYear}
              onChange={(e) => setLaunchYear(e.target.value)}
              className={inputClass}
              placeholder="ex. 2010"
            />
          </div>
          <div>
            <label className={labelClass}>Parfumier</label>
            <input
              value={perfumer}
              onChange={(e) => setPerfumer(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descriere</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Poveste (opțional)</label>
            <textarea
              rows={3}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descriere EN (opțional)</label>
            <textarea
              rows={3}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="EN description (optional, fallback to RO)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Poveste EN (opțional)</label>
            <textarea
              rows={3}
              value={storyEn}
              onChange={(e) => setStoryEn(e.target.value)}
              placeholder="EN story (optional, fallback to RO)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Activ
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              Recomandat
            </label>
          </div>
        </div>
      </section>

      {/* Variants */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-medium">Variante (decanturi)</h2>
          <button
            type="button"
            onClick={() =>
              setVariants((v) => [
                ...v,
                { sizeML: 10, price: 0, initialQuantity: 0, lowStockThreshold: 5 },
              ])
            }
            className="flex items-center gap-1.5 text-sm text-gold-dark hover:underline"
          >
            <Plus className="size-4" /> Adaugă variantă
          </button>
        </div>
        <div className="space-y-3">
          {variants.map((variant, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Labeled label="Mărime (ml)">
                <input
                  type="number"
                  value={variant.sizeML}
                  onChange={(e) => updateVariant(i, { sizeML: Number(e.target.value) })}
                  className={inputClass}
                />
              </Labeled>
              <Labeled label="Preț (RON)">
                <input
                  type="number"
                  value={variant.price}
                  onChange={(e) => updateVariant(i, { price: Number(e.target.value) })}
                  className={inputClass}
                />
              </Labeled>
              <Labeled label="Stoc inițial">
                <input
                  type="number"
                  value={variant.initialQuantity}
                  onChange={(e) =>
                    updateVariant(i, { initialQuantity: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </Labeled>
              <Labeled label="Prag stoc redus">
                <input
                  type="number"
                  value={variant.lowStockThreshold}
                  onChange={(e) =>
                    updateVariant(i, { lowStockThreshold: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </Labeled>
              <div className="flex items-end">
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setVariants((v) => v.filter((_, idx) => idx !== i))}
                    className="flex h-10 items-center gap-1 text-sm text-destructive hover:underline"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Olfactory notes */}
      {notes.length > 0 && (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-1 font-medium">Note olfactive</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Alege poziția fiecărei note în piramidă (lasă gol pentru a o exclude).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {notes.map((note) => {
              const current = notePositions[note.id] ?? "";
              return (
                <div
                  key={note.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border px-3 py-2",
                    current ? "border-gold/50 bg-gold/5" : "border-border",
                  )}
                >
                  <span className="text-sm">{note.name}</span>
                  <select
                    value={current}
                    onChange={(e) =>
                      setNotePosition(
                        note.id,
                        e.target.value as NotePosition | "",
                      )
                    }
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:border-gold focus:outline-none"
                  >
                    <option value="">—</option>
                    {NOTE_POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Images */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-5 font-medium">Imagini</h2>
        <CloudinaryUpload
          value={images}
          onChange={setImages}
          folder={CLOUDINARY_PRODUCTS_FOLDER}
        />
      </section>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/produse")}
          className="rounded-md border border-border px-6 py-2.5 text-sm"
        >
          Anulează
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-background hover:bg-gold-light disabled:opacity-60"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Creează produs
        </button>
      </div>
    </form>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}
