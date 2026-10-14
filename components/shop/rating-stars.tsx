import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;
  size?: number;
  className?: string;
}

/** Gold star row supporting half-star precision (read-only display). */
export function RatingStars({ value, size = 16, className }: RatingStarsProps) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Evaluare ${value.toFixed(1)} din 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star
              className="absolute inset-0 text-muted-2"
              style={{ width: size, height: size }}
            />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className="fill-gold text-gold"
                style={{ width: size, height: size }}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}
