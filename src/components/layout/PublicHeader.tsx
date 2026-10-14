"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck } from "@/components/icons";
import { Container } from "@/components/layout/Container";
import { MobileNav } from "@/components/layout/MobileNav";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useSession } from "next-auth/react";

/**
 * Responsive site navbar: logo, desktop link row with active-link
 * highlighting, a "Get a Quote" CTA, and a MobileNav drawer on small
 * screens. Sticky so it stays reachable while scrolling long pages.
 */
export function PublicHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const dashboardHref = session?.user ? "/admin/dashboard" : "/sign-in";

  const authButtonLabel = session?.user ? "Go to Dashboard" : "Transporter Login";

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 rounded-md font-semibold text-brand-800"
        >
          {/* <span className=""> */}
            <Image
              src="/media/UTS-logo.png"
              alt="Mastery Hub"
              width={70}
              height={50}
              priority
            />
          {/* </span> */}
          <span className="text-h4">{siteConfig.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {siteConfig.navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "focus-ring rounded-md px-3 py-2 text-body-sm font-medium transition-colors",
                  isActive ? "text-brand-700" : "text-neutral-600 hover:text-brand-700"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/quote"
            className="focus-ring hidden h-10 items-center justify-center rounded-lg bg-brand-700 px-4 text-body-sm font-medium text-white hover:bg-brand-800 sm:inline-flex"
          >
            Get a Quote
          </Link>

          {status === "loading" ? (
            <span className="hidden h-10 items-center justify-center rounded-lg border border-neutral-200 px-4 text-body-sm font-medium text-neutral-500 sm:inline-flex">
              Loading...
            </span>
          ) : (
            <Link
              href={dashboardHref}
              className="focus-ring hidden h-10 items-center justify-center rounded-lg border border-neutral-200 px-4 text-body-sm font-medium text-neutral-700 hover:bg-neutral-50 sm:inline-flex"
            >
              {authButtonLabel}
            </Link>
          )}

          <MobileNav />
        </div>
      </Container>
    </header>
  );
}