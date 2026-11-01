import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { findTruckType, type TruckTypeKey } from "@/lib/lorry-hire/truck-types";

/**
 * One-colour line icons for each truck type, side view, facing right.
 *
 * Every icon is drawn the same way — 1.8 px outline, round joins, same ground
 * line, same wheels — and uses only `currentColor`, so the whole set is always
 * ONE colour. Change it with a text colour class (default: navy).
 *
 * Plain inline SVG: no ids, images, fonts or hooks, so the same markup renders
 * in the form, on the printable contract and in the PDF.
 */

const W = 1.8; // outline
const F = 1.2; // fine detail

/** Wheel: ring with a hub dot. Ground line is y = 33. */
const Wheel = ({ cx, r = 3.3 }: { cx: number; r?: number }) => (
  <g>
    <circle cx={cx} cy={29.7} r={r} />
    <circle cx={cx} cy={29.7} r={0.9} fill="currentColor" stroke="none" />
  </g>
);

/** Heavy cab (x 52–70) standing on the chassis line y = 25. */
const HeavyCab = () => (
  <g>
    <path d="M52 25V12.5h8.2c1 0 1.9.5 2.4 1.3l5.4 8.5c.4.6.6 1.3.6 2V25" />
    <path d="M55 15.5h5l3.9 5.8H55z" strokeWidth={F} />
  </g>
);

/** Cab for the small trucks; `x` is its left edge. */
const SmallCab = ({ x }: { x: number }) => (
  <g transform={`translate(${x - 38} 0)`}>
    <path d="M38 25V14h7c1 0 1.8.5 2.3 1.3l4.7 6.5c.3.5.5 1.1.5 1.7V25" />
    <path d="M40.6 16.4h3.9l2.9 4.3h-6.8z" strokeWidth={F} />
  </g>
);

const Chassis = ({ x1 = 2, x2 = 70 }: { x1?: number; x2?: number }) => <path d={`M${x1} 25H${x2}`} />;

/** Rigid heavy truck: chassis, cab, rear tandem + front wheel. */
const Heavy = () => (
  <>
    <Chassis />
    <HeavyCab />
    <Wheel cx={14} />
    <Wheel cx={22} />
    <Wheel cx={60} />
  </>
);

/** Tractor unit with a trailer behind it. */
const Rig = ({ axles = [8, 15, 22] }: { axles?: number[] }) => (
  <>
    <Chassis />
    <HeavyCab />
    {axles.map((a) => (
      <Wheel key={a} cx={a} />
    ))}
    <Wheel cx={56} />
    <Wheel cx={64} />
  </>
);

const vlines = (xs: number[], y1: number, y2: number) => <path d={xs.map((x) => `M${x} ${y1}V${y2}`).join("")} strokeWidth={F} />;

/** A small outlined car for the vehicle carrier (about 12 wide, standing on y + 7). */
const Car = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`} strokeWidth={1.1}>
    <path d="M0.4 6.2H12v-1.5L10.4 3C10 2.4 9.4 2 8.6 2H3.6c-.8 0-1.4.4-1.8 1L.4 4.7z" />
    <circle cx={3.4} cy={6.4} r={1} fill="#fff" />
    <circle cx={9} cy={6.4} r={1} fill="#fff" />
  </g>
);

const ICONS: Record<TruckTypeKey | "generic", ReactNode> = {
  any: (
    <>
      <rect x={3} y={5} width={47} height={20} rx={2} />
      <text x={26.5} y={18} textAnchor="middle" fontSize={7.6} fontWeight={800} fontFamily="Arial, Helvetica, sans-serif" fill="currentColor" stroke="none" letterSpacing={0.3}>
        ANY SIZE
      </text>
      <Heavy />
    </>
  ),

  mini: (
    <g transform="translate(2 0)">
      <rect x={12} y={14} width={26} height={11} rx={1.6} />
      {vlines([21, 29], 14, 25)}
      <SmallCab x={38} />
      <Chassis x1={10} x2={53} />
      <Wheel cx={21} />
      <Wheel cx={45} />
    </g>
  ),

  pickup: (
    <g transform="translate(3 0)">
      <path d="M8 25V17h28v8" />
      <path d="M37 25V15h6.6c1 0 1.9.5 2.4 1.4l3.4 5.6H55c1 0 1.7.8 1.7 1.7V25" />
      <path d="M39.6 17h3.6l2.3 3.8h-5.9z" strokeWidth={F} />
      <Chassis x1={7} x2={57} />
      <Wheel cx={18} />
      <Wheel cx={47} />
    </g>
  ),

  small: (
    <g transform="translate(3 0)">
      <rect x={4} y={8} width={37} height={17} rx={1.8} />
      {vlines([13, 22, 31], 8, 25)}
      <SmallCab x={42} />
      <Chassis x1={3} x2={58} />
      <Wheel cx={15} />
      <Wheel cx={50} />
    </g>
  ),

  "half-body": (
    <>
      <rect x={3} y={13} width={47} height={12} rx={1.8} />
      <path d="M3 17h47" strokeWidth={F} />
      {vlines([12, 21, 30, 39], 17, 25)}
      <Heavy />
    </>
  ),

  "full-body": (
    <>
      <rect x={3} y={6} width={47} height={19} rx={2} />
      <path d="M3 11h47" strokeWidth={F} />
      {vlines([14, 25, 36], 11, 25)}
      <Heavy />
    </>
  ),

  "flat-body": (
    <>
      <rect x={3} y={20.5} width={47} height={4.5} rx={1} />
      <path d="M6 20.5V15M18 20.5V15M30 20.5V15M42 20.5V15M50 20.5V11" />
      <Heavy />
    </>
  ),

  container: (
    <>
      <rect x={3} y={4} width={47} height={21} rx={1.8} />
      {vlines([8, 12, 16, 20, 24, 28, 32, 36, 40, 44], 7, 22)}
      <Heavy />
    </>
  ),

  "half-trailer": (
    <>
      <rect x={2} y={14} width={48} height={11} rx={1.8} />
      <path d="M2 18h48" strokeWidth={F} />
      {vlines([12, 22, 32, 42], 18, 25)}
      <Rig />
    </>
  ),

  "full-trailer": (
    <>
      <rect x={2} y={5} width={48} height={20} rx={2} />
      <path d="M2 10h48" strokeWidth={F} />
      {vlines([12, 22, 32, 42], 10, 25)}
      <Rig />
    </>
  ),

  "flat-trailer": (
    <>
      <rect x={2} y={20.5} width={48} height={4.5} rx={1} />
      <path d="M8 20.5V17M20 20.5V17M32 20.5V17M44 20.5V17" />
      <Rig />
    </>
  ),

  tanker: (
    <>
      <rect x={3} y={6} width={47} height={19} rx={9.5} />
      <path d="M9 11h35" strokeWidth={F} strokeLinecap="round" />
      {vlines([14, 39], 6.5, 24.5)}
      <path d="M23 6V3.2h7V6" />
      <Heavy />
    </>
  ),

  tipper: (
    <>
      <path d="M3 25V7h41l6 6v12" strokeLinejoin="round" />
      <path d="M10 25l7-14M20 25l7-14M30 25l7-14" strokeWidth={F + 0.4} />
      <Heavy />
    </>
  ),

  "tractor-trailer": (
    <>
      <rect x={2} y={20.5} width={36} height={4.5} rx={1} />
      <path d="M38 25v-4.5l5-4.5h9v9" />
      <Chassis x1={38} />
      <HeavyCab />
      {[6, 12.5, 19, 25.5].map((a) => (
        <Wheel key={a} cx={a} r={2.9} />
      ))}
      <Wheel cx={56} />
      <Wheel cx={64} />
    </>
  ),

  "vehicle-carrier": (
    <>
      <rect x={3} y={3} width={47} height={22} rx={1.8} />
      <path d="M3 14h47" />
      {[6, 19, 32].map((x) => (
        <Car key={`u${x}`} x={x} y={6.4} />
      ))}
      {[6, 19, 32].map((x) => (
        <Car key={`l${x}`} x={x} y={17.2} />
      ))}
      <Heavy />
    </>
  ),

  bulker: (
    <>
      <path d="M3 17C3 10.5 9 7 16 7h20c8.5 0 14 3.5 14 9.5V25H11L3 19z" strokeLinejoin="round" />
      <path d="M10 11.5h30" strokeWidth={F} strokeLinecap="round" />
      <path d="M26 7V4h7v3" />
      <Heavy />
    </>
  ),

  "concrete-mixer": (
    <>
      <g transform="translate(4 1.5) rotate(7 27 14)">
        <path d="M3 17L12 6h26c7 0 11 3.6 11 8.4S45 23 38 23H12z" strokeLinejoin="round" />
        <path d="M17 22.5l3.5-15.5M26 22.8l3.5-16M35 22.8l3.5-16" strokeWidth={F + 0.4} />
        <path d="M3 17l-2 4.5" />
      </g>
      <Heavy />
    </>
  ),

  generic: (
    <>
      <rect x={3} y={7} width={47} height={18} rx={2} />
      {vlines([14, 25, 36], 7, 25)}
      <Heavy />
    </>
  ),
};

interface TruckTypeIconProps {
  /** The stored truck type text (or a catalog key). Unknown values show a plain truck. */
  type?: string | null;
  className?: string;
  /** Hide from screen readers when the type is already written next to the icon. */
  decorative?: boolean;
}

export function TruckTypeIcon({ type, className, decorative = true }: TruckTypeIconProps) {
  const entry = findTruckType(type);
  const key = entry?.key ?? "generic";
  return (
    <svg
      viewBox="0 0 74 36"
      fill="none"
      stroke="currentColor"
      strokeWidth={W}
      strokeLinecap="round"
      strokeLinejoin="round"
      // One colour for the whole set; override with any text-* class.
      className={cn("h-7 w-14 shrink-0 select-none text-[#1B2559]", className)}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : (entry?.label ?? "Truck")}
      data-truck-type={key}
    >
      {ICONS[key]}
    </svg>
  );
}