import { cn } from "@/lib/utils";

/** Small container-truck illustration for the contract cards. Pure SVG, no assets. */
export function LorryTruckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" role="img" aria-label="Truck" className={cn("h-11 w-14 shrink-0 select-none", className)}>
      {/* container */}
      <rect x="2" y="6" width="36" height="28" rx="2.5" fill="#dbeafe" stroke="#93c5fd" />
      <rect x="2" y="26" width="36" height="5" fill="#86efac" />
      <path d="M12 6v28M22 6v28M31 6v28" stroke="#bfdbfe" strokeWidth="1.2" />
      {/* cab */}
      <path d="M40 14h10.5c1.3 0 2.4.7 3 1.8L59 25c.4.7.6 1.4.6 2.2V34H40z" fill="#2563eb" />
      <path d="M43 17.5h7.6l4.3 7.5H43z" fill="#bae6fd" />
      <rect x="2" y="34" width="58" height="3" rx="1.5" fill="#1e3a8a" />
      {/* wheels */}
      {[14, 28, 50].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="38.5" r="6" fill="#1f2937" />
          <circle cx={cx} cy="38.5" r="2.4" fill="#e5e7eb" />
        </g>
      ))}
    </svg>
  );
}
