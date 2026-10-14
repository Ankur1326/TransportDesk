"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, MessageCircle } from "@/components/icons";
import { siteConfig, buildTelLink, buildWhatsAppLink } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Self-contained mobile navigation: a hamburger button that opens a
 * full-height slide-in panel. Locks body scroll while open and closes
 * on route change, backdrop click, or Escape — standard mobile drawer
 * accessibility behavior.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-neutral-950/40 transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Slide-in panel */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5">
          <span className="font-semibold text-brand-800">{siteConfig.name}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Mobile primary" className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="space-y-1">
            {siteConfig.navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "focus-ring block rounded-lg px-3 py-3 text-base font-medium",
                      isActive ? "bg-brand-50 text-brand-700" : "text-neutral-700 hover:bg-neutral-50"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-3 border-t border-neutral-200 p-5">
          <Link
            href="/quote"
            className="focus-ring flex h-11 w-full items-center justify-center rounded-lg bg-brand-700 text-sm font-medium text-white hover:bg-brand-800"
          >
            Get a Quote
          </Link>
          <div className="flex gap-3">
            <a
              href={buildTelLink()}
              className="focus-ring flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call
            </a>
            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-success-500 text-sm font-medium text-success-700 hover:bg-success-50"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}