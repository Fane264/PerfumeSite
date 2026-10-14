import { ShieldCheck, Truck, RotateCcw, Lock } from "lucide-react";

const BADGES = [
  { icon: ShieldCheck, label: "Autenticitate garantată" },
  { icon: Truck, label: "Livrare în 24–48h" },
  { icon: RotateCcw, label: "Retur gratuit 14 zile" },
  { icon: Lock, label: "Plată securizată SSL" },
] as const;

/** Reassurance row shown beneath the add-to-cart button. */
export function TrustBadges() {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {BADGES.map((badge) => (
        <li
          key={badge.label}
          className="flex flex-col items-center gap-1.5 text-center"
        >
          <badge.icon className="size-5 text-gold" />
          <span className="text-[11px] leading-tight text-muted-foreground">
            {badge.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
