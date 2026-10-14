import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComingSoonBadgeProps {
  className?: string;
}

/** Pulsing "LANSARE CURÂND" badge for coming-soon products on cards. */
export function ComingSoonBadge({ className }: ComingSoonBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-gold/70 bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold",
        "animate-pulse",
        className,
      )}
    >
      <Sparkles className="size-3" />
      Lansare curând
    </span>
  );
}
