"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Package,
  Pause,
  XCircle,
  Check,
  Truck,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { familyBadgeClass } from "@/lib/family";
import {
  subscriptionApi,
  type BoxPreferencesDto,
  type SubscriptionBoxDto,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Option {
  slug: string;
  name: string;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activ",
  PAST_DUE: "Plată restantă",
  CANCELLED: "Anulat",
  PAUSED: "În pauză",
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "bg-emerald-950/50 text-emerald-300 border-emerald-800/50",
  PAST_DUE: "bg-amber-950/50 text-amber-300 border-amber-800/50",
  CANCELLED: "bg-zinc-800 text-zinc-400 border-zinc-600",
  PAUSED: "bg-sky-950/50 text-sky-300 border-sky-800/50",
};

const BOX_STEPS = ["PREPARING", "CURATING", "SHIPPED", "DELIVERED"];
const BOX_LABEL: Record<string, string> = {
  PREPARING: "În pregătire",
  CURATING: "Se curează",
  SHIPPED: "Expediat",
  DELIVERED: "Livrat",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SubscriptionManageView({
  families,
  notes,
}: {
  families: Option[];
  notes: Option[];
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["subscription", "my"],
    queryFn: subscriptionApi.my,
  });

  const [editing, setEditing] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["subscription", "my"] });

  const cancel = useMutation({
    mutationFn: subscriptionApi.cancel,
    onSuccess: invalidate,
  });
  const pause = useMutation({
    mutationFn: subscriptionApi.pause,
    onSuccess: invalidate,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-32 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border text-gold">
          <Package className="size-7" />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-light text-cream">
          Nu ai un abonament activ
        </h1>
        <p className="mt-2 text-muted-foreground">
          Abonează-te la Discovery Box și primește decanturi noi în fiecare lună.
        </p>
        <Link
          href="/abonament"
          className="mt-6 inline-flex border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Vezi planurile
        </Link>
      </div>
    );
  }

  const prefs: BoxPreferencesDto = data.preferences ?? {
    families: [],
    excludeNotes: [],
    gender: "SURPRISE",
  };

  return (
    <div className="container py-28 md:py-32">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-luxe text-gold">Abonamentul meu</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-cream">
          {data.plan.name}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Plan + actions */}
        <div className="border border-border bg-surface p-8">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "rounded-sm border px-3 py-1 text-xs font-medium uppercase tracking-wide",
                STATUS_CLASS[data.status],
              )}
            >
              {STATUS_LABEL[data.status] ?? data.status}
            </span>
            <span className="font-serif text-2xl text-gold">
              {data.plan.price.toLocaleString("ro-RO")} {data.plan.currency}
              <span className="text-sm text-muted-foreground">/lună</span>
            </span>
          </div>

          <div className="mt-6 border-t border-border pt-6 text-sm">
            <p className="text-muted-foreground">
              {data.cancelAtPeriodEnd ? "Se oprește la" : "Următoarea facturare"}:{" "}
              <span className="text-cream">{fmtDate(data.currentPeriodEnd)}</span>
            </p>
            {data.cancelAtPeriodEnd && (
              <p className="mt-1 text-amber-400">
                Abonamentul va fi anulat la finalul perioadei curente.
              </p>
            )}
          </div>

          {data.status === "ACTIVE" && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={pause.isPending}
                onClick={() => {
                  if (confirm("Pauzezi abonamentul? Nu vei fi taxat până la reluare."))
                    pause.mutate();
                }}
              >
                {pause.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Pause className="size-4" />
                )}
                Pauzează
              </Button>
              {!data.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  className="border-error/50 text-error hover:bg-error/10"
                  disabled={cancel.isPending}
                  onClick={() => {
                    if (confirm("Anulezi abonamentul la finalul perioadei?"))
                      cancel.mutate();
                  }}
                >
                  {cancel.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  Anulează
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className="border border-border bg-surface p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-light text-cream">Preferințe</h2>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-sm text-gold hover:text-gold-light"
            >
              {editing ? "Renunță" : "Modifică"}
            </button>
          </div>

          {editing ? (
            <PreferencesEditor
              families={families}
              notes={notes}
              initial={prefs}
              onSaved={() => {
                setEditing(false);
                invalidate();
              }}
            />
          ) : (
            <div className="mt-4 space-y-4 text-sm">
              <PrefRow label="Familii">
                {prefs.families.length
                  ? prefs.families.join(", ")
                  : "Toate familiile"}
              </PrefRow>
              <PrefRow label="Note evitate">
                {prefs.excludeNotes.length ? prefs.excludeNotes.join(", ") : "Niciuna"}
              </PrefRow>
              <PrefRow label="Gen">{prefs.gender}</PrefRow>
            </div>
          )}
        </div>
      </div>

      {/* Box history */}
      <div className="mt-6">
        <h2 className="mb-4 font-serif text-2xl font-light text-cream">
          Istoricul cutiilor
        </h2>
        {data.boxes.length === 0 ? (
          <p className="border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Prima ta cutie este în pregătire. Revino curând!
          </p>
        ) : (
          <div className="space-y-3">
            {data.boxes.map((box) => (
              <BoxRow key={box.id} box={box} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PrefRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border pt-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-cream">{children}</p>
    </div>
  );
}

function BoxRow({ box }: { box: SubscriptionBoxDto }) {
  const [open, setOpen] = useState(false);
  const stepIndex = BOX_STEPS.indexOf(box.status);
  const contents = Array.isArray(box.contents)
    ? (box.contents as { perfumeName: string; sizeML?: number }[])
    : [];

  return (
    <div className="border border-border bg-surface p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4"
      >
        <div className="text-left">
          <p className="font-serif text-lg text-cream">{box.month}</p>
          <p className="text-xs text-muted-foreground">
            {BOX_LABEL[box.status] ?? box.status}
            {box.trackingNumber ? ` · AWB ${box.trackingNumber}` : ""}
          </p>
        </div>
        <ChevronDown
          className={cn("size-4 text-gold transition-transform", open && "rotate-180")}
        />
      </button>

      {/* Status timeline */}
      <div className="mt-4 flex items-center gap-1">
        {BOX_STEPS.map((step, i) => (
          <div key={step} className="flex flex-1 items-center gap-1">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px]",
                i <= stepIndex
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border text-muted-foreground",
              )}
            >
              {i < stepIndex ? <Check className="size-3" /> : i === stepIndex ? <Truck className="size-3" /> : i + 1}
            </span>
            {i < BOX_STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  i < stepIndex ? "bg-gold" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {open && (
        <div className="mt-4 border-t border-border pt-4 text-sm">
          {contents.length > 0 ? (
            <ul className="space-y-1 text-muted-foreground">
              {contents.map((c, i) => (
                <li key={i}>
                  {c.perfumeName}
                  {c.sizeML ? ` · ${c.sizeML} ml` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Conținutul acestei cutii va fi dezvăluit la livrare.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const GENDERS: { value: BoxPreferencesDto["gender"]; label: string }[] = [
  { value: "MASCULINE", label: "Masculin" },
  { value: "FEMININE", label: "Feminin" },
  { value: "UNISEX", label: "Unisex" },
  { value: "SURPRISE", label: "Surpriză" },
];

function PreferencesEditor({
  families,
  notes,
  initial,
  onSaved,
}: {
  families: Option[];
  notes: Option[];
  initial: BoxPreferencesDto;
  onSaved: () => void;
}) {
  const [prefFamilies, setPrefFamilies] = useState<string[]>(initial.families);
  const [excludeNotes, setExcludeNotes] = useState<string[]>(initial.excludeNotes);
  const [gender, setGender] = useState<BoxPreferencesDto["gender"]>(initial.gender);

  const save = useMutation({
    mutationFn: () =>
      subscriptionApi.updatePreferences({
        families: prefFamilies,
        excludeNotes,
        gender,
      }),
    onSuccess: onSaved,
  });

  const toggle = (list: string[], set: (v: string[]) => void, slug: string) =>
    set(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);

  return (
    <div className="mt-4 space-y-5">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Familii
        </p>
        <div className="flex flex-wrap gap-2">
          {families.map((f) => (
            <Chip
              key={f.slug}
              active={prefFamilies.includes(f.slug)}
              onClick={() => toggle(prefFamilies, setPrefFamilies, f.slug)}
              className={prefFamilies.includes(f.slug) ? familyBadgeClass(f.slug) : undefined}
            >
              {f.name}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Note evitate
        </p>
        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
          {notes.map((n) => (
            <Chip
              key={n.slug}
              active={excludeNotes.includes(n.slug)}
              onClick={() => toggle(excludeNotes, setExcludeNotes, n.slug)}
            >
              {n.name}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Gen
        </p>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <Chip key={g.value} active={gender === g.value} onClick={() => setGender(g.value)}>
              {g.label}
            </Chip>
          ))}
        </div>
      </div>
      <Button variant="gold" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending && <Loader2 className="size-4 animate-spin" />}
        Salvează preferințele
      </Button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-gold bg-gold/10 text-gold"
          : "border-border text-cream hover:border-gold/50",
        className,
      )}
    >
      {children}
    </button>
  );
}
