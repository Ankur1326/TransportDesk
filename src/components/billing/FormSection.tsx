"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, ClipboardList, FileText, IndianRupee, Layers, Package,
  Percent, Route, ShieldCheck, StickyNote, Truck, Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardLabel } from "@/components/ui/CardLabel";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Small action rendered on the right of the header, e.g. a toggle switch. */
  headerAction?: React.ReactNode;
  /** Overrides the icon picked from the title. */
  icon?: ReactNode;
}

/** Header icon per section, matched on the section title. */
const TITLE_ICONS: Record<string, LucideIcon> = {
  "LR details": FileText,
  Consigner: ArrowUpFromLine,
  Consignee: ArrowDownToLine,
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

export function FormSection({ title, description, children, className, headerAction, icon }: FormSectionProps) {
  const [ref, revealed] = useRevealed<HTMLDivElement>();
  const Icon = TITLE_ICONS[title] ?? ClipboardList;

  return (
    <div ref={ref} className={cn(revealed ? "uts-rise" : "opacity-0 print:opacity-100")}>
      <Card
        padding="none"
        className={cn(
          "group/section relative scroll-mt-20 overflow-hidden rounded-xl border-slate-200 shadow-sm transition-shadow duration-300 hover:shadow-md focus-within:border-brand-300 focus-within:shadow-md",
          className
        )}
      >
        <CardLabel title={title} icon={icon ?? <Icon />} right={headerAction} />
        <div className="p-3">
          {description && (
            <p className="mb-3 text-xs leading-snug text-slate-500">{description}</p>
          )}
          {children}
        </div>
      </Card>
    </div>
  );
}
