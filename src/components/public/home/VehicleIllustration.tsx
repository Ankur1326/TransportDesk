import { cn } from "@/lib/utils";

type VehicleVariant = "mini-truck" | "pickup" | "medium-truck" | "container-truck";

interface VehicleIllustrationProps {
  variant: VehicleVariant;
  className?: string;
}

const BODY_WIDTH: Record<VehicleVariant, number> = {
  "mini-truck": 62,
  pickup: 78,
  "medium-truck": 112,
  "container-truck": 148,
};

const REAR_AXLE: Record<VehicleVariant, boolean> = {
  "mini-truck": false,
  pickup: false,
  "medium-truck": true,
  "container-truck": true,
};

/**
 * Flat side-view vehicle illustration. One parametric SVG shape shared
 * across fleet cards (instead of stock photography) so every card looks
 * consistent regardless of what real vehicle photos are available later.
 */
export function VehicleIllustration({ variant, className }: VehicleIllustrationProps) {
  const bodyWidth = BODY_WIDTH[variant];
  const cabX = 20;
  const cabWidth = 34;
  const bodyX = cabX + cabWidth + 4;
  const bodyEnd = bodyX + bodyWidth;
  const groundY = 96;
  const isContainer = variant === "container-truck";

  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-hidden="true"
    >
      {/* Ground line */}
      <line x1="6" y1={groundY + 22} x2="234" y2={groundY + 22} stroke="#d7dce2" strokeWidth="2" />

      {/* Cargo body */}
      <rect
        x={bodyX}
        y={groundY - 34}
        width={bodyWidth}
        height="42"
        rx="3"
        fill="#eceef1"
        stroke="#b6bfc9"
        strokeWidth="1.5"
      />
      {/* Container ridge lines for the larger variant */}
      {isContainer &&
        Array.from({ length: Math.floor(bodyWidth / 14) }).map((_, i) => (
          <line
            key={i}
            x1={bodyX + 8 + i * 14}
            y1={groundY - 30}
            x2={bodyX + 8 + i * 14}
            y2={groundY + 4}
            stroke="#d7dce2"
            strokeWidth="1"
          />
        ))}

      {/* Cab */}
      <path
        d={`M${cabX},${groundY + 8} L${cabX},${groundY - 14} Q${cabX},${groundY - 22} ${cabX + 8},${groundY - 22} L${cabX + cabWidth - 6},${groundY - 22} L${cabX + cabWidth},${groundY + 8} Z`}
        fill="#DB7007"
      />
      {/* Cab window */}
      <path
        d={`M${cabX + 6},${groundY - 4} L${cabX + 6},${groundY - 14} Q${cabX + 6},${groundY - 18} ${cabX + 10},${groundY - 18} L${cabX + cabWidth - 10},${groundY - 18} L${cabX + cabWidth - 6},${groundY - 4} Z`}
        fill="#F7B577"
      />

      {/* Accent stripe along cargo body */}
      <rect x={bodyX} y={groundY + 2} width={bodyWidth} height="6" fill="#DB7007" />

      {/* Wheels */}
      <circle cx={cabX + 12} cy={groundY + 22} r="9" fill="#1f2227" />
      <circle cx={cabX + 12} cy={groundY + 22} r="3.5" fill="#8f9aa8" />
      <circle cx={bodyX + 18} cy={groundY + 22} r="9" fill="#1f2227" />
      <circle cx={bodyX + 18} cy={groundY + 22} r="3.5" fill="#8f9aa8" />
      {REAR_AXLE[variant] && (
        <>
          <circle cx={bodyEnd - 20} cy={groundY + 22} r="9" fill="#1f2227" />
          <circle cx={bodyEnd - 20} cy={groundY + 22} r="3.5" fill="#8f9aa8" />
        </>
      )}
    </svg>
  );
}