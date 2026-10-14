"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Switch } from "@/components/ui/switch";

/** Inline active/inactive toggle for the admin product table (PUT by slug). */
export function ProductActiveToggle({
  slug,
  initialActive,
}: {
  slug: string;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    setActive(next);
    setSaving(true);
    try {
      await apiFetch(`/api/perfumes/${slug}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: next }),
      });
      toast.success(next ? "Produs activat" : "Produs dezactivat");
    } catch (error) {
      setActive(!next);
      toast.error(error instanceof ApiError ? error.message : "Eroare");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Switch checked={active} onCheckedChange={toggle} disabled={saving} />
      <span className={cn("text-xs", active ? "text-success" : "text-muted-foreground")}>
        {active ? "Activ" : "Inactiv"}
      </span>
    </div>
  );
}
