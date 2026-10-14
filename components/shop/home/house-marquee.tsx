const FALLBACK_HOUSES = [
  "CREED",
  "XERJOFF",
  "AMOUAGE",
  "INITIO",
  "SERGE LUTENS",
  "MAISON MARGIELA",
  "ROJA DOVE",
  "ORTO PARISI",
];

/**
 * Infinite, CSS-driven marquee of partner houses. The content is duplicated so
 * the `-50%` keyframe loop is seamless.
 */
export function HouseMarquee({ houses }: { houses?: string[] }) {
  const names = houses && houses.length > 0 ? houses : FALLBACK_HOUSES;
  const sequence = [...names, ...names];

  return (
    <div className="overflow-hidden border-y border-border bg-surface py-5">
      <div className="flex w-max animate-marquee items-center">
        {sequence.map((name, i) => (
          <span key={i} className="flex items-center">
            <span className="px-8 font-serif text-lg uppercase tracking-widest text-muted-foreground">
              {name}
            </span>
            <span className="text-gold" aria-hidden>
              ◆
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
