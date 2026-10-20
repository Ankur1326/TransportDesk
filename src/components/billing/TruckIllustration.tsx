import { cn } from "@/lib/utils";

/**
 * Decorative header scene: a container truck on a soft hill-and-tree
 * backdrop with a route pin. Pure SVG, no external assets.
 */
export function TruckIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 440 150"
      role="img"
      aria-label="Delivery truck on the road"
      className={cn("h-full w-auto select-none overflow-visible", className)}
    >
      <defs>
        <linearGradient id="tr-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dbeafe" />
          <stop offset="1" stopColor="#eff6ff" />
        </linearGradient>
        <linearGradient id="tr-box" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
        <linearGradient id="tr-cab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            .tr-bob { animation: tr-bob 1.6s ease-in-out infinite; transform-box: fill-box; }
            .tr-road { animation: tr-road 1.2s linear infinite; }
            .tr-pin { animation: tr-pin 2.4s ease-in-out infinite; transform-box: fill-box; }
          }
          @keyframes tr-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-1.2px) } }
          @keyframes tr-road { to { stroke-dashoffset: -28 } }
          @keyframes tr-pin { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        `}</style>
      </defs>

      {/* hills */}
      <ellipse cx="300" cy="150" rx="170" ry="78" fill="url(#tr-hill)" />
      <ellipse cx="400" cy="150" rx="100" ry="58" fill="#e0ecff" opacity=".8" />
      <ellipse cx="120" cy="150" rx="110" ry="40" fill="#eff6ff" />

      {/* clouds */}
      <g fill="#fff" opacity=".95">
        <ellipse cx="110" cy="28" rx="24" ry="8" />
        <ellipse cx="124" cy="22" rx="14" ry="9" />
        <ellipse cx="360" cy="46" rx="20" ry="6" />
        <ellipse cx="372" cy="41" rx="11" ry="7" />
      </g>

      {/* trees */}
      <g>
        <rect x="55" y="96" width="3" height="22" fill="#5eb5a6" />
        <ellipse cx="56.5" cy="82" rx="11" ry="24" fill="#8fd8cb" />
        <rect x="80" y="104" width="3" height="14" fill="#5eb5a6" />
        <ellipse cx="81.5" cy="94" rx="8" ry="16" fill="#b4e6dc" />
        <rect x="418" y="92" width="3" height="26" fill="#5eb5a6" />
        <ellipse cx="419.5" cy="76" rx="12" ry="26" fill="#8fd8cb" />
      </g>

      {/* route pin */}
      <g className="tr-pin">
        <path
          d="M338 14c-9 0-16 7-16 16 0 12 16 28 16 28s16-16 16-28c0-9-7-16-16-16z"
          fill="#6366f1"
        />
        <circle cx="338" cy="30" r="6" fill="#fff" />
      </g>
      <ellipse cx="338" cy="62" rx="9" ry="2.5" fill="#6366f1" opacity=".18" />

      {/* road */}
      <rect x="0" y="126" width="440" height="6" rx="3" fill="#dbeafe" />
      <line
        x1="0" y1="129" x2="440" y2="129"
        stroke="#fff" strokeWidth="1.6" strokeDasharray="14 14" className="tr-road"
      />

      {/* truck */}
      <g className="tr-bob">
        {/* ground shadow */}
        <ellipse cx="225" cy="126" rx="108" ry="4" fill="#1e3a8a" opacity=".12" />

        {/* container */}
        <rect x="132" y="48" width="154" height="62" rx="4" fill="url(#tr-box)" stroke="#93c5fd" />
        <g stroke="#93c5fd" strokeWidth="1.2" opacity=".9">
          {Array.from({ length: 13 }, (_, i) => (
            <line key={i} x1={142 + i * 11} y1="53" x2={142 + i * 11} y2="105" />
          ))}
        </g>
        <rect x="132" y="104" width="154" height="8" rx="2" fill="#60a5fa" />

        {/* chassis */}
        <rect x="132" y="110" width="226" height="6" rx="2" fill="#1e40af" />

        {/* cab */}
        <path d="M288 112V70c0-5 3-8 8-8h30c5 0 8 2 11 6l16 22c2 3 3 5 3 9v13z" fill="url(#tr-cab)" />
        <path d="M300 70h22c3 0 5 1 7 4l12 17h-41z" fill="#dbeafe" />
        <path d="M300 70h10l-6 21h-4z" fill="#fff" opacity=".35" />
        <rect x="350" y="98" width="9" height="6" rx="1.5" fill="#fde68a" />
        <rect x="294" y="98" width="14" height="2" rx="1" fill="#1e3a8a" opacity=".5" />

        {/* wheels */}
        {[176, 208, 322].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="116" r="11" fill="#1e293b" />
            <circle cx={cx} cy="116" r="5" fill="#cbd5e1" />
            <circle cx={cx} cy="116" r="1.8" fill="#64748b" />
          </g>
        ))}
      </g>
    </svg>
  );
}
