"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "@/components/icons";
import { BrandMark } from "@/components/auth/BrandMark";
import { brand, SIGN_IN_HREF, SIGN_UP_HREF } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Mobile drawer. Locks body scroll while open and closes on route change,
 * backdrop click or Escape.
 */
export function MobileNav({ signedIn = false }: { signedIn?: boolean }) {
  // Remember *which page* the drawer was opened on; navigating elsewhere closes it
  // without needing an effect to reset state.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenOn(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-neutral-950/40 transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5">
          <BrandMark />
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
            {brand.navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "focus-ring block rounded-lg px-3 py-3 text-base font-medium",
                      isActive ? "bg-brand-50 text-brand-700" : "text-neutral-700 hover:bg-neutral-50"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-3 border-t border-neutral-200 p-5">
          {signedIn ? (
            <Link
              href="/admin/dashboard"
              className="focus-ring flex h-11 w-full items-center justify-center rounded-lg bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href={SIGN_UP_HREF}
                className="focus-ring flex h-11 w-full items-center justify-center rounded-lg bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Get started
              </Link>
              <Link
                href={SIGN_IN_HREF}
                className="focus-ring flex h-11 w-full items-center justify-center rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
