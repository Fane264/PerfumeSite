import { cn } from "@/lib/utils";

/** Shimmering placeholder block. Reserve real dimensions to avoid layout shift. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer rounded-sm bg-surface2/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
