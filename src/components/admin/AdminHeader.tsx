"use client";

import { usePathname } from "next/navigation";
import { HiOutlineMenuAlt2 } from "@/components/icons";
import Navbar from "@/components/Navbar";
import { getAdminPageTitle } from "@/lib/admin-page-meta";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function AdminHeader({
  isSidebarOpen,
  onToggleSidebar,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const pageTitle = getAdminPageTitle(pathname);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between",
        "border-b border-neutral-200/80 bg-white/95 backdrop-blur-md",
        "dark:border-brand-800/60 dark:bg-brand-950/90",
        "md:pl-64 print:hidden"
      )}
    >
      {/* Accent line — echoes sidebar orange cut */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-accent-500 via-accent-400 to-transparent opacity-80 md:left-64"
      />

      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 md:px-6">
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:hidden",
            "text-brand-800 transition-colors hover:bg-neutral-100",
            "dark:text-brand-100 dark:hover:bg-brand-900",
            "outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:ring-offset-2"
          )}
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          aria-expanded={isSidebarOpen}
          aria-controls="main-sidebar"
        >
          <HiOutlineMenuAlt2 className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Transporter Panel
          </p>
          <h1 className="truncate text-body-sm font-semibold text-brand-900 dark:text-white">
            {pageTitle}
          </h1>
        </div>

      </div>

      <div className="flex shrink-0 items-center px-4 md:px-6">
        <Navbar />
      </div>
    </header>
  );
}
