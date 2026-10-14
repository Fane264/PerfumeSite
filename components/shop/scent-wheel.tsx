interface WheelSegment {
  name: string;
  percentage: number;
  colorHex: string;
}

interface ScentWheelProps {
  segments: WheelSegment[];
  size?: number;
}

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const startOuter = polar(cx, cy, rOuter, endAngle);
  const endOuter = polar(cx, cy, rOuter, startAngle);
  const startInner = polar(cx, cy, rInner, startAngle);
  const endInner = polar(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

/**
 * Personalized olfactory wheel — a donut where the user's top families are
 * sized by their share and tinted with each family's color; the remainder is a
 * muted "unexplored" segment.
 */
export function ScentWheel({ segments, size = 260 }: ScentWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter * 0.58;

  const known = segments.reduce((sum, s) => sum + s.percentage, 0);
  const data = [...segments];
  if (known < 100) {
    data.push({ name: "Neexplorat", percentage: 100 - known, colorHex: "#2A2A2A" });
  }

  let angle = 0;
  const total = data.reduce((sum, s) => sum + s.percentage, 0) || 1;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Roata olfactivă personalizată"
      data-testid="scent-wheel"
      className="mx-auto"
    >
      {data.map((seg, i) => {
        const sweep = (seg.percentage / total) * 360;
        const start = angle;
        const end = angle + sweep;
        angle = end;
        // Guard against a single full-circle segment (path needs two arcs).
        const safeEnd = end - start >= 360 ? start + 359.9 : end;
        return (
          <path
            key={`${seg.name}-${i}`}
            d={arcPath(cx, cy, rOuter, rInner, start, safeEnd)}
            fill={seg.colorHex}
            stroke="#111111"
            strokeWidth={2}
          >
            <title>
              {seg.name} — {seg.percentage}%
            </title>
          </path>
        );
      })}
      <circle cx={cx} cy={cy} r={rInner - 2} fill="#111111" />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        className="fill-cream font-serif"
        style={{ fontSize: 16 }}
      >
        Profilul
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        className="fill-gold font-serif"
        style={{ fontSize: 16 }}
      >
        tău
      </text>
    </svg>
  );
}
