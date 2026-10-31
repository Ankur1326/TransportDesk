"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { FilePlus2, List, Plus, Receipt, Truck } from "@/components/icons";
import { cn } from "@/lib/utils";

interface TopBarTab {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

interface TopBarGroup {
  label: string;
  tabs: TopBarTab[];
}

/**
 * Pages that get a top tab bar. To show the bar on another page, add a group
 * here (or add a tab to an existing group) — no per-page code needed.
 * The bar appears on any route that matches one of a group's tabs.
 */
export const TOP_BAR_GROUPS: TopBarGroup[] = [
  {
    label: "Bilty navigation",
    tabs: [
      { label: "List All Bilties", href: "/admin/bookings", icon: List },
      { label: "Create Bilty", href: "/admin/consignment/new", icon: Plus },
    ],
  },
  {
    label: "Billing navigation",
    tabs: [
      { label: "List All Bills", href: "/admin/billings", icon: Receipt },
      { label: "Create Bill", href: "/admin/billing/new", icon: FilePlus2 },
    ],
  },
  {
    label: "Lorry hire navigation",
    tabs: [
      { label: "List Contracts", href: "/admin/lorry-hires", icon: List },
      { label: "New Contract", href: "/admin/lorry-hire/new", icon: Truck },
    ],
  },
];

const matches = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/** Accent follows the app theme (falls back to blue if the token isn't set). */
const ACCENT = "var(--app-sidebar-active-mark, #2563eb)";

/**
 * Global top tab bar, rendered once by the app layout.
 *
 * Flat and square (no rounded corners): sits flush at the top of the content
 * column with no padding or margin, spans its full width, and stays pinned
 * while the page scrolls. The sidebar is a separate column, so it never overlaps.
 */
export function GlobalTopBar() {
  const pathname = usePathname();
  const group = TOP_BAR_GROUPS.find((g) => g.tabs.some((t) => matches(pathname, t.href)));
  if (!group) return null;

  // Most specific tab wins, so "/admin/lorry-hire/new" can never light up "/admin/lorry-hires" too.
  const activeHref = group.tabs
    .filter((t) => matches(pathname, t.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label={group.label}
      className="sticky top-0 z-30 m-0 w-full p-0 print:hidden"
    >
      <ul
        className={cn(
          "m-0 flex w-full list-none p-0",
          "border-b border-[var(--app-border)] bg-[var(--app-card-background)]"
        )}
      >
        {group.tabs.map((tab, index) => {
          const isActive = tab.href === activeHref;
          const Icon = tab.icon;

          const className = cn(
            "group relative flex h-12 w-full min-w-0 items-center justify-center gap-2 px-4",
            "text-sm tracking-tight transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-sidebar-active-mark,#2563eb)]",
            index > 0 && "border-l border-[var(--app-border)]",
            isActive
              ? "bg-[var(--app-card-background)] font-semibold text-[var(--app-text)]"
              : cn(
                  "bg-[color-mix(in_srgb,var(--app-border)_30%,var(--app-card-background))]",
                  "font-medium text-[var(--app-muted-text)]",
                  "hover:bg-[color-mix(in_srgb,var(--app-border)_12%,var(--app-card-background))] hover:text-[var(--app-text)]"
                )
          );

          const content = (
            <>
              {/* Active indicator: flat 3px bar along the bottom edge */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 bottom-0 h-[3px] transition-opacity duration-150",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-30"
                )}
                style={{ backgroundColor: ACCENT }}
              />
              <Icon
                aria-hidden="true"
                className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "" : "opacity-70 group-hover:opacity-100")}
              />
              <span className="truncate">{tab.label}</span>
            </>
          );

          return (
            <li key={tab.href} className="flex min-w-0 flex-1">
              {isActive ? (
                <span aria-current="page" className={className}>
                  {content}
                </span>
              ) : (
                <Link href={tab.href} className={className}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}