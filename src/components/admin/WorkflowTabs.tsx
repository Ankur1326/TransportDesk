import Link from "next/link";
import { cn } from "@/lib/utils";

type Workflow = "consignment" | "billing";
type WorkflowPage = "list" | "create";

const WORKFLOWS: Record<Workflow, { label: string; href: string }[]> = {
  consignment: [
    { label: "List All Bilties", href: "/admin/bookings" },
    { label: "Create Bilty", href: "/admin/consignment/new" },
  ],
  billing: [
    { label: "List All Bills", href: "/admin/billings" },
    { label: "Create Bill", href: "/admin/billing/new" },
  ],
};

export function WorkflowTabs({
  workflow,
  activePage,
}: {
  workflow: Workflow;
  activePage: WorkflowPage;
}) {
  return (
    <nav
      aria-label={`${workflow === "consignment" ? "Bilty" : "Billing"} navigation`}
      className="mb-5 print:hidden"
    >
      <div className="flex w-full rounded-xl border border-neutral-200 bg-neutral-100 p-1 shadow-sm dark:border-brand-800 dark:bg-brand-900/70">
        {WORKFLOWS[workflow].map((item, index) => {
          const isActive = (activePage === "list" ? 0 : 1) === index;
          const className = cn(
            "flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors sm:px-4",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-950",
            isActive
              ? "bg-white text-brand-900 shadow-sm ring-1 ring-neutral-200 dark:bg-brand-800 dark:text-white dark:ring-brand-700"
              : "text-neutral-600 hover:bg-white/70 hover:text-brand-900 dark:text-neutral-300 dark:hover:bg-brand-800/70 dark:hover:text-white"
          );

          return isActive ? (
            <span key={item.href} aria-current="page" className={className}>
              {item.label}
            </span>
          ) : (
            <Link key={item.href} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
