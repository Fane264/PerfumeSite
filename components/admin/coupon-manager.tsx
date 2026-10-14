"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn, formatPrice } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export interface AdminCoupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minOrderAmount: number | null;
  maxUsageCount: number | null;
  usageCount: number;
  isActive: boolean;
  expiresAt: string | null;
}

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-gold focus:outline-none";
const labelClass =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function CouponManager({ coupons }: { coupons: AdminCoupon[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create form state.
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUsage, setMaxUsage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await apiFetch("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          type,
          value: Number(value),
          minOrderAmount: minOrder ? Number(minOrder) : null,
          maxUsageCount: maxUsage ? Number(maxUsage) : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          isActive: true,
        }),
      });
      toast.success("Cupon creat");
      setCode("");
      setValue("");
      setMinOrder("");
      setMaxUsage("");
      setExpiresAt("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Creare eșuată");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(coupon: AdminCoupon) {
    setBusyId(coupon.id);
    try {
      await apiFetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Acțiune eșuată");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(coupon: AdminCoupon) {
    if (!confirm(`Ștergi cuponul ${coupon.code}?`)) return;
    setBusyId(coupon.id);
    try {
      await apiFetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
      toast.success("Cupon șters");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Ștergere eșuată");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Create form */}
      <form
        onSubmit={createCoupon}
        className="rounded-xl border bg-card p-6"
      >
        <h2 className="mb-5 font-medium">Adaugă cupon</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Cod</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              className={cn(inputClass, "uppercase")}
            />
          </div>
          <div>
            <label className={labelClass}>Tip</label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")
              }
              className={inputClass}
            >
              <option value="PERCENTAGE">Procent (%)</option>
              <option value="FIXED_AMOUNT">Sumă fixă (RON)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Valoare {type === "PERCENTAGE" ? "(%)" : "(RON)"}
            </label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Comandă minimă (RON)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="Opțional"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Utilizări maxime</label>
            <input
              type="number"
              min="1"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
              placeholder="Nelimitat"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Expiră la</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-gold-light disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Creează cupon
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3 font-medium">Cod</th>
              <th className="p-3 font-medium">Reducere</th>
              <th className="p-3 font-medium">Min. comandă</th>
              <th className="p-3 font-medium">Utilizări</th>
              <th className="p-3 font-medium">Expiră</th>
              <th className="p-3 font-medium">Activ</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-muted-foreground"
                >
                  Niciun cupon încă.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => {
                const expired =
                  coupon.expiresAt !== null &&
                  new Date(coupon.expiresAt).getTime() < Date.now();
                return (
                  <tr key={coupon.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{coupon.code}</td>
                    <td className="p-3">
                      {coupon.type === "PERCENTAGE"
                        ? `${coupon.value}%`
                        : formatPrice(coupon.value, "RON")}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {coupon.minOrderAmount
                        ? formatPrice(coupon.minOrderAmount, "RON")
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {coupon.usageCount}
                      {coupon.maxUsageCount ? ` / ${coupon.maxUsageCount}` : ""}
                    </td>
                    <td
                      className={cn(
                        "p-3 text-muted-foreground",
                        expired && "text-destructive",
                      )}
                    >
                      {coupon.expiresAt
                        ? new Date(coupon.expiresAt).toLocaleDateString("ro-RO")
                        : "—"}
                    </td>
                    <td className="p-3">
                      {busyId === coupon.id ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={coupon.isActive}
                          onCheckedChange={() => toggleActive(coupon)}
                          aria-label="Activează cuponul"
                        />
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => remove(coupon)}
                        aria-label="Șterge cuponul"
                        className="text-destructive transition-colors hover:opacity-70"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
