import { cn } from "@/lib/utils";
import { familyBadgeClass } from "@/lib/family";
import type { ApiFamilySummary } from "@/types";

/** Olfactory-family chip, coloured by family slug. */
export function FamilyBadge({
  family,
  className,
}: {
  family: Pick<ApiFamilySummary, "name" | "slug">;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        familyBadgeClass(family.slug),
        className,
      )}
    >
      {family.name}
    </span>
  );
}
