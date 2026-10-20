"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpFromLine, ChevronUp, ClipboardList, FileText, IndianRupee, Layers, Package,
  Percent, Route, ShieldCheck, StickyNote, Truck, UserRound, Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "../ui/Card";
import { CardLabel } from "../ui/CardLabel";

export type FormSectionAccent = "sky" | "teal" | "violet";

/** Colour recipe per accent: header wash, icon tile, link/pill colour. */
const ACCENTS: Record<FormSectionAccent, { header: string; tile: string; link: string; focus: string }> = {
  sky: {
    header: "bg-gradient-to-r from-sky-100/90 via-sky-50 to-white",
    tile: "bg-gradient-to-br from-teal-500 to-cyan-700 shadow-teal-600/25",
    link: "text-sky-700 hover:text-sky-900",
    focus: "focus-within:border-sky-300",
  },
  teal: {
    header: "bg-gradient-to-r from-teal-100/80 via-teal-50 to-white",
    tile: "bg-gradient-to-br from-teal-500 to-emerald-700 shadow-teal-600/25",
    link: "text-teal-700 hover:text-teal-900",
    focus: "focus-within:border-teal-300",
  },
  violet: {
    header: "bg-gradient-to-r from-violet-100/90 via-violet-50 to-white",
    tile: "bg-gradient-to-br from-violet-500 to-indigo-700 shadow-violet-600/25",
    link: "text-violet-700 hover:text-violet-900",
    focus: "focus-within:border-violet-300",
  },
};

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Small action rendered on the right of the header, e.g. a toggle switch. */
  headerAction?: React.ReactNode;
  /** Overrides the icon picked from the title. */
  icon?: ReactNode;
  /** Colour theme of the header and icon tile. */
  accent?: FormSectionAccent;
  /** Adds a show/hide link in the header; the body stays mounted so form values are kept. */
  collapsible?: boolean;
  /** Text of the collapse link, e.g. "Shipment Details". */
  collapseLabel?: string;
}

/** Header icon per section, matched on the section title. */
const TITLE_ICONS: Record<string, LucideIcon> = {
  "LR details": FileText,
  Consigner: ArrowUpFromLine,
  Consignor: UserRound,
  Consignee: UserRound,
  "Shipment route": Route,
  "Shipment Details": Package,
  "Vehicle & transport": Truck,
  "Segment & Load Type": Layers,
  "Freight & Charges": IndianRupee,
  GST: Percent,
  "Payment / Billing Information": Wallet,
  Insurance: ShieldCheck,
  "Additional Information": StickyNote,
};

/** True once the element has scrolled into view (immediately if IntersectionObserver is missing). */
function useRevealed<T extends Element>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, revealed] as const;
}

export function FormSection({
  title, description, children, className, headerAction, icon,
  accent = "sky", collapsible = false, collapseLabel = "Details",
}: FormSectionProps) {
  const [ref, revealed] = useRevealed<HTMLDivElement>();
  const [open, setOpen] = useState(true);
  const Icon = TITLE_ICONS[title] ?? ClipboardList;
  const theme = ACCENTS[accent];
  const bodyId = useId();

  return (
    <div ref={ref} className={cn(revealed ? "uts-rise" : "opacity-0 print:opacity-100")}>
      <Card
        padding="none"
        className={cn(
          "group/section relative scroll-mt-20 overflow-hidden rounded-md border border-sky-100 bg-white",
          "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(14,116,144,0.18)]",
          "transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_30px_-12px_rgba(14,116,144,0.28)]",
          theme.focus,
          className
        )}
      >
        <CardLabel title={title} icon={icon ?? <Icon />} right={headerAction} />
        <div
          id={bodyId}
          inert={!open}
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          {/* <div className="overflow-hidden"> */}
          <div className="p-4">
            {description && (
              <p className="mb-3 text-[13px] leading-snug text-slate-500">{description}</p>
            )}
            {children}
          </div>
        </div>
      </Card>
    </div>
  );
}
