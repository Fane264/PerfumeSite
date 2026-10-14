"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Search, X } from "lucide-react";
import {
  adminFlashSalesApi,
  adminVariantsApi,
  type AdminVariantOption,
  type FlashSaleProductInput,
} from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-amber-100 text-amber-700",
  expired: "bg-zinc-200 text-zinc-600",
};

interface DraftProduct extends FlashSaleProductInput {
  label: string;
  originalPrice: number;
}

const todayLocal = () => new Date().toISOString().slice(0, 16);

export function FlashSaleManager() {
  const queryClient = useQueryClient();
  const { data: sales, isLoading } = useQuery({
    queryKey: ["admin", "flash-sales"],
    queryFn: adminFlashSalesApi.list,
  });

  const [showForm, setShowForm] = useState(false);

  const remove = useMutation({
    mutationFn: adminFlashSalesApi.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "flash-sales"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Anulează" : "Vânzare nouă"}
        </Button>
      </div>

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-gold" />
        </div>
      ) : !sales || sales.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nicio vânzare flash creată încă.
        </p>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => (
            <div key={sale.id} className="rounded-lg border bg-background p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block size-4 rounded-full"
                    style={{ backgroundColor: sale.bannerColor }}
                  />
                  <div>
                    <p className="font-medium">{sale.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.startsAt).toLocaleString("ro-RO")} →{" "}
                      {new Date(sale.endsAt).toLocaleString("ro-RO")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${STATUS_BADGE[sale.status]}`}
                  >
                    {sale.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Ștergi vânzarea "${sale.title}"?`)) {
                        remove.mutate(sale.id);
                      }
                    }}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Șterge"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {sale.products.map((p) => {
                  const pct = p.stockLimit
                    ? Math.min(100, Math.round((p.unitsSold / p.stockLimit) * 100))
                    : null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-4 rounded-md bg-secondary/40 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {p.perfumeName} · {p.sizeML}ml
                      </span>
                      <span className="text-muted-foreground line-through">
                        {formatPrice(p.originalPrice)}
                      </span>
                      <span className="font-medium text-destructive">
                        {formatPrice(p.salePrice)}
                      </span>
                      <span className="w-32 shrink-0">
                        {p.stockLimit ? (
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
                              <span
                                className="block h-full bg-gold"
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {p.unitsSold}/{p.stockLimit}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {p.unitsSold} vândute
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">(
    "PERCENTAGE",
  );
  const [discountValue, setDiscountValue] = useState(20);
  const [bannerColor, setBannerColor] = useState("#C9A84C");
  const [startsAt, setStartsAt] = useState(todayLocal());
  const [endsAt, setEndsAt] = useState(todayLocal());
  const [products, setProducts] = useState<DraftProduct[]>([]);

  const [search, setSearch] = useState("");
  const { data: options } = useQuery({
    queryKey: ["admin", "variants", search],
    queryFn: () => adminVariantsApi.search(search),
    enabled: search.length > 1,
  });

  const create = useMutation({
    mutationFn: () =>
      adminFlashSalesApi.create({
        title,
        description: description || undefined,
        discountType,
        discountValue,
        bannerColor,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        isActive: true,
        products: products.map((p) => ({
          variantId: p.variantId,
          salePrice: p.salePrice,
          stockLimit: p.stockLimit ?? null,
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "flash-sales"] });
      onDone();
    },
  });

  function addProduct(opt: AdminVariantOption) {
    if (products.some((p) => p.variantId === opt.id)) return;
    const suggested =
      discountType === "PERCENTAGE"
        ? Math.round(opt.price * (1 - discountValue / 100) * 100) / 100
        : Math.max(0, opt.price - discountValue);
    setProducts((prev) => [
      ...prev,
      {
        variantId: opt.id,
        label: opt.label,
        originalPrice: opt.price,
        salePrice: suggested,
        stockLimit: null,
      },
    ]);
    setSearch("");
  }

  return (
    <div className="space-y-4 rounded-lg border bg-background p-5">
      <h2 className="font-medium">Vânzare flash nouă</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Titlu</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Culoare banner</span>
          <input
            type="color"
            value={bannerColor}
            onChange={(e) => setBannerColor(e.target.value)}
            className="h-10 w-full rounded-md border"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-muted-foreground">Descriere</span>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Tip discount</span>
          <select
            value={discountType}
            onChange={(e) =>
              setDiscountType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")
            }
            className="h-10 w-full rounded-md border bg-background px-3"
          >
            <option value="PERCENTAGE">Procent (%)</option>
            <option value="FIXED_AMOUNT">Sumă fixă (RON)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Valoare discount</span>
          <Input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Început</span>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Sfârșit</span>
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </label>
      </div>

      {/* Product picker */}
      <div>
        <p className="mb-1 text-sm text-muted-foreground">Adaugă produse</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută parfum…"
            className="pl-9"
          />
          {options && options.length > 0 && search.length > 1 && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-lg">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => addProduct(opt)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <span>{opt.label}</span>
                  <span className="text-muted-foreground">{formatPrice(opt.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {products.map((p, i) => (
            <div
              key={p.variantId}
              className="flex items-center gap-3 rounded-md bg-secondary/40 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{p.label}</span>
              <label className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Preț</span>
                <Input
                  type="number"
                  value={p.salePrice}
                  onChange={(e) =>
                    setProducts((prev) =>
                      prev.map((x, xi) =>
                        xi === i ? { ...x, salePrice: Number(e.target.value) } : x,
                      ),
                    )
                  }
                  className="h-8 w-24"
                />
              </label>
              <label className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Stoc</span>
                <Input
                  type="number"
                  value={p.stockLimit ?? ""}
                  placeholder="∞"
                  onChange={(e) =>
                    setProducts((prev) =>
                      prev.map((x, xi) =>
                        xi === i
                          ? {
                              ...x,
                              stockLimit: e.target.value
                                ? Number(e.target.value)
                                : null,
                            }
                          : x,
                      ),
                    )
                  }
                  className="h-8 w-20"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setProducts((prev) => prev.filter((_, xi) => xi !== i))
                }
                className="text-muted-foreground hover:text-destructive"
                aria-label="Elimină"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {create.isError && (
        <p className="text-sm text-destructive">
          {(create.error as Error).message}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => create.mutate()}
          disabled={create.isPending || !title || products.length === 0}
        >
          {create.isPending && <Loader2 className="size-4 animate-spin" />}
          Creează vânzarea
        </Button>
        <Button variant="outline" onClick={onDone}>
          Anulează
        </Button>
      </div>
    </div>
  );
}
