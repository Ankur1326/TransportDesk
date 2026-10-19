"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandMark } from "@/components/auth/BrandMark";
import { Container } from "@/components/layout/Container";
import { MobileNav } from "@/components/layout/MobileNav";
import { brand, SIGN_IN_HREF, SIGN_UP_HREF } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Sticky marketing header: brand, primary nav, and auth actions that adapt to
 * the session (Sign in / Get started  →  Go to dashboard).
 */
export function PublicHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signedIn = Boolean(session?.user);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-white/90 backdrop-blur transition-shadow",
        scrolled ? "border-neutral-200 shadow-sm" : "border-transparent"
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-6">
        <BrandMark />

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {brand.navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "focus-ring rounded-md px-3 py-2 text-body-sm font-medium transition-colors",
                  isActive ? "text-brand-700" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Reserve the space while the session loads so the buttons don't jump. */}
          <div className={cn("hidden items-center gap-2 sm:flex", status === "loading" && "invisible")}>
            {signedIn ? (
              <Link
                href="/admin/dashboard"
                className="focus-ring inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-4 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-800"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href={SIGN_IN_HREF}
                  className="focus-ring inline-flex h-10 items-center justify-center rounded-lg px-4 text-body-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Sign in
                </Link>
                <Link
                  href={SIGN_UP_HREF}
                  className="focus-ring inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-4 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-800"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          <MobileNav signedIn={signedIn} />
        </div>
      </Container>
    </header>
  );
}
