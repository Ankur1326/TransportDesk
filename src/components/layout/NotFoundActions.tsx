"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, LayoutDashboard } from "@/components/icons";
import { brand, SIGN_IN_HREF } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Interactive part of the 404 page. Lives in a client component because it
 * needs the session (signed-in people get a way back to the dashboard), the
 * browser history and the address that could not be found.
 */
export function NotFoundActions() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const signedIn = Boolean(session?.user);

  const links = [
    { href: "/features", label: "Features" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    ...(signedIn ? [] : [{ href: SIGN_IN_HREF, label: "Sign in" }]),
  ];

  return (
    <>
      {pathname && pathname !== "/" && (
        <p className="mt-6 flex max-w-full items-center gap-2 text-body-sm text-neutral-500">
          <span className="shrink-0">You tried to open</span>
          <code className="truncate rounded-md bg-neutral-100 px-2 py-1 font-mono text-[0.8125rem] text-neutral-700">
            {pathname}
          </code>
        </p>
      )}

      {/* Reserve the space while the session loads so the buttons don't jump. */}
      <div className={cn("mt-8 flex flex-col gap-3 sm:flex-row", status === "loading" && "invisible")}>
        {signedIn ? (
          <Link
            href="/admin/dashboard"
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-body font-semibold text-white shadow-sm transition hover:bg-brand-800"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Go to dashboard
          </Link>
        ) : (
          <Link
            href="/"
            className="focus-ring inline-flex h-12 items-center justify-center rounded-lg bg-brand-700 px-6 text-body font-semibold text-white shadow-sm transition hover:bg-brand-800"
          >
            Back to home
          </Link>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-6 text-body font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go back
        </button>
      </div>

      <nav aria-label="Helpful links" className="mt-10 border-t border-neutral-200 pt-6">
        <p className="text-caption font-semibold uppercase tracking-wide text-neutral-500">
          Or head to
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="focus-ring rounded-sm text-body-sm font-medium text-brand-700 underline-offset-4 hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        {(brand.supportEmail || brand.supportPhone) && (
          <p className="mt-4 text-body-sm text-neutral-500">
            Think this is a mistake? Contact us at{" "}
            <a
              href={brand.supportEmail ? `mailto:${brand.supportEmail}` : `tel:${brand.supportPhone.replace(/[^\d+]/g, "")}`}
              className="font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-900"
            >
              {brand.supportEmail || brand.supportPhone}
            </a>
            .
          </p>
        )}
      </nav>
    </>
  );
}
