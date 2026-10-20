/**
 * "Lost shipment" illustration: a truck that has reached the end of its route.
 * Pure SVG using the brand palette, so it stays crisp at any size. The dashed
 * road animates unless the person prefers reduced motion (see .nf-road).
 */
export function NotFoundIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 340"
      role="img"
      aria-label="A delivery truck stopped at the end of a road, next to a map pin with a question mark"
      className={className}
    >
      {/* Soft backdrop */}
      <circle cx="240" cy="170" r="150" className="fill-brand-50" />
      <circle cx="240" cy="170" r="104" className="fill-brand-100/70" />

      {/* Clouds */}
      <g className="fill-white">
        <rect x="64" y="70" width="72" height="16" rx="8" />
        <rect x="84" y="58" width="40" height="16" rx="8" />
        <rect x="350" y="100" width="64" height="14" rx="7" />
        <rect x="366" y="90" width="34" height="14" rx="7" />
      </g>

      {/* Big 404 watermark */}
      <text
        x="240"
        y="152"
        textAnchor="middle"
        className="fill-brand-200/80"
        style={{ fontSize: 110, fontWeight: 800, letterSpacing: -4 }}
      >
        404
      </text>

      {/* Road */}
      <rect x="20" y="238" width="440" height="42" rx="21" className="fill-neutral-800" />
      <line
        x1="40"
        y1="259"
        x2="440"
        y2="259"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="14 12"
        className="nf-road stroke-neutral-400"
      />

      {/* Map pin with "?" at the dead end */}
      <g transform="translate(372 120)">
        <ellipse cx="0" cy="116" rx="18" ry="5" className="fill-neutral-900/15" />
        <path
          d="M0 112 C-26 78 -34 62 -34 40 A34 34 0 1 1 34 40 C34 62 26 78 0 112 Z"
          className="fill-brand-600"
        />
        <circle cx="0" cy="38" r="22" className="fill-white" />
        <text
          x="0"
          y="48"
          textAnchor="middle"
          className="fill-brand-700"
          style={{ fontSize: 28, fontWeight: 800 }}
        >
          ?
        </text>
      </g>

      {/* Truck (faces right) */}
      <g transform="translate(96 168)">
        {/* cargo box */}
        <rect x="0" y="0" width="120" height="66" rx="8" className="fill-white stroke-neutral-300" strokeWidth="2" />
        <rect x="0" y="0" width="120" height="14" rx="8" className="fill-brand-600" />
        <rect x="0" y="8" width="120" height="6" className="fill-brand-600" />
        <rect x="16" y="28" width="52" height="8" rx="4" className="fill-neutral-200" />
        <rect x="16" y="43" width="34" height="8" rx="4" className="fill-neutral-200" />
        {/* cab */}
        <path d="M124 20 H152 Q160 20 165 28 L180 46 Q184 52 184 58 V66 H124 Z" className="fill-brand-700" />
        <path d="M134 28 H150 Q154 28 157 33 L166 46 H134 Z" className="fill-brand-100" />
        <rect x="176" y="52" width="8" height="8" rx="2" className="fill-accent-300" />
        {/* chassis */}
        <rect x="-4" y="64" width="192" height="8" rx="4" className="fill-neutral-700" />
        {/* wheels */}
        {[32, 148].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="74" r="15" className="fill-neutral-900" />
            <circle cx={cx} cy="74" r="6" className="fill-neutral-300" />
          </g>
        ))}
      </g>

      {/* Warning cone at the end of the road */}
      <g transform="translate(316 206)">
        <path d="M12 0 L22 32 H2 Z" className="fill-accent-400" />
        <rect x="6" y="14" width="12" height="5" className="fill-white" />
        <rect x="-2" y="32" width="28" height="5" rx="2" className="fill-neutral-800" />
      </g>
    </svg>
  );
}
