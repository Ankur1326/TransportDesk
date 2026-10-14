import { cn } from "@/lib/utils";

interface RouteIllustrationProps {
  className?: string;
}

/**
 * Flat, brand-colored illustration of a delivery route: a curved road from
 * an origin pin to a destination pin, a truck in transit, and a dashed
 * "route" line matching the .route-divider motif used elsewhere on the
 * site. Built as inline SVG (not a stock photo) so it's crisp at any
 * size, loads instantly, and can't 404 — and it's specific to this
 * product rather than generic freeway/warehouse stock imagery.
 * Hex values mirror the shared orange brand palette.
 */
export function RouteIllustration({ className }: RouteIllustrationProps) {
  return (
    <svg
      viewBox="0 0 560 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label="Illustration of a delivery route from pickup to destination"
    >
      <rect x="0" y="0" width="560" height="480" rx="24" fill="#623000" />

      {/* Road */}
      <path
        d="M70,410 C170,410 190,230 300,230 C410,230 420,90 500,90"
        stroke="#873f00"
        strokeWidth="26"
        strokeLinecap="round"
      />
      {/* Dashed route line (lane marking) */}
      <path
        d="M70,410 C170,410 190,230 300,230 C410,230 420,90 500,90"
        stroke="#DB7007"
        strokeWidth="3"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />

      {/* Waypoint dots */}
      <circle cx="150" cy="392" r="4" fill="#ffffff" fillOpacity="0.35" />
      <circle cx="330" cy="180" r="4" fill="#ffffff" fillOpacity="0.35" />

      {/* Origin pin */}
      <circle cx="70" cy="410" r="11" fill="#DB7007" stroke="#623000" strokeWidth="3" />
      <circle cx="70" cy="410" r="4" fill="#623000" />

      {/* Destination pin */}
      <circle cx="500" cy="90" r="13" fill="#ffffff" />
      <circle cx="500" cy="90" r="5" fill="#DB7007" />

      {/* Truck, positioned mid-route */}
      <g transform="translate(255,205) rotate(-28)">
        <rect x="0" y="10" width="72" height="30" rx="4" fill="#ffffff" />
        <rect x="52" y="0" width="26" height="26" rx="3" fill="#DB7007" />
        <circle cx="16" cy="42" r="7" fill="#2d1500" />
        <circle cx="58" cy="42" r="7" fill="#2d1500" />
        <circle cx="16" cy="42" r="2.5" fill="#8f9aa8" />
        <circle cx="58" cy="42" r="2.5" fill="#8f9aa8" />
      </g>
    </svg>
  );
}