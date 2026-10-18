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
      // Pinned to the top while the page scrolls underneath
      className="sticky top-0  z-30 print:hidden"
    >
      <div
        className={cn(
          "flex w-full divide-x divide-[var(--app-border)]",
          "border border-[var(--app-border)] bg-[var(--app-card-background)] shadow-sm"
        )}
      >
        {WORKFLOWS[workflow].map((item, index) => {
          const isActive = (activePage === "list" ? 0 : 1) === index;
          const className = cn(
            "flex min-h-10 min-w-0 flex-1 items-center justify-center border-b-[3px]  text-center text-sm transition-colors sm:px-4",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/60",
            isActive
              ? "border-blue-500 bg-[var(--app-card-background)] font-semibold text-blue-600 dark:text-blue-400"
              : cn(
                  "border-transparent bg-[color-mix(in_srgb,var(--app-border)_35%,var(--app-card-background))]",
                  "font-medium text-[var(--app-muted-text)]",
                  "hover:bg-[var(--app-card-background)] hover:text-[var(--app-text)]"
                )
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