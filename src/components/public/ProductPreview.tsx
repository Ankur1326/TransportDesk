import { Check, FileText, Printer, Truck } from "@/components/icons";
import { cn } from "@/lib/utils";

const rows = [
  { lr: "4", route: "Jaipur → Ahmedabad", status: "On Route", tone: "bg-info-50 text-info-700" },
  { lr: "3", route: "Delhi → Jaipur", status: "Delivered", tone: "bg-success-50 text-success-700" },
  { lr: "2", route: "Surat → Indore", status: "Booked", tone: "bg-warning-50 text-warning-700" },
  { lr: "1", route: "Jodhpur → Pune", status: "Delivered", tone: "bg-success-50 text-success-700" },
];

/**
 * Decorative product mock-up built from plain markup (no screenshots to keep
 * in sync). Hidden from assistive tech — the numbers are illustrative.
 */
export function ProductPreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-200/70 via-accent-100/60 to-transparent blur-2xl" />

      {/* Window */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_60px_-20px_rgb(45_21_0/0.35)]">
        <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="ml-3 text-caption font-medium text-neutral-500">Bookings</span>
        </div>

        <div className="p-4 sm:p-5">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              ["All", "24", true],
              ["Booked", "6", false],
              ["On Route", "9", false],
              ["Delivered", "9", false],
            ].map(([label, count, active]) => (
              <span
                key={label as string}
                className={cn(
                  "rounded-full px-3 py-1 text-caption font-semibold",
                  active ? "bg-brand-700 text-white" : "bg-neutral-100 text-neutral-600"
                )}
              >
                {label} · {count}
              </span>
            ))}
          </div>

          {/* Rows */}
          <ul className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
            {rows.map((row) => (
              <li key={row.lr} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Truck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-semibold text-neutral-900">LR #{row.lr}</p>
                  <p className="truncate text-caption text-neutral-500">{row.route}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-caption font-semibold", row.tone)}>{row.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute -bottom-6 -left-3 hidden items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-card sm:flex lg:-left-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-50 text-success-600">
          <Check className="h-5 w-5" />
        </span>
        <div>
          <p className="text-body-sm font-semibold text-neutral-900">Delivered</p>
          <p className="text-caption text-neutral-500">Proof of delivery uploaded</p>
        </div>
      </div>

      <div className="absolute -right-2 -top-5 hidden items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-card sm:flex lg:-right-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <p className="text-body-sm font-semibold text-neutral-900">4 LR copies</p>
          <p className="flex items-center gap-1 text-caption text-neutral-500">
            <Printer className="h-3 w-3" /> Ready to print
          </p>
        </div>
      </div>
    </div>
  );
}
