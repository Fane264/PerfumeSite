"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BulkAction {
  id: string;
  label: string;
  variant?: "default" | "danger";
}

/**
 * Floating action bar shown while one or more rows are selected. Reusable across
 * admin tables (orders, products). Renders nothing when nothing is selected.
 */
export function BulkActions({
  selectedIds,
  actions,
  onAction,
  onClear,
  busy = false,
}: {
  selectedIds: string[];
  actions: BulkAction[];
  onAction: (actionId: string) => void;
  onClear: () => void;
  busy?: boolean;
}) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-2xl">
        <span className="text-sm font-medium">
          {selectedIds.length} selectate
        </span>
        <span className="h-5 w-px bg-border" />
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={busy}
            onClick={() => onAction(action.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors disabled:opacity-50",
              action.variant === "danger"
                ? "border border-error/40 text-red-300 hover:bg-error/10"
                : "border border-border hover:border-gold hover:text-gold",
            )}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          aria-label="Deselectează tot"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" /> Deselectează
        </button>
      </div>
    </div>
  );
}
