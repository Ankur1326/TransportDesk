"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "@/components/icons";
import { Button } from "@/components/Button";

interface Props {
  open: boolean;
  /** What the person tried to do, e.g. "create a bilty". */
  action?: string;
  /**
   * true  -> can be closed ("Not now", Esc, click outside) — for buttons on a list page.
   * false -> blocks the whole page until the name is added — for the create pages.
   */
  dismissible?: boolean;
  onClose?: () => void;
}

/** Blocking box shown when someone tries to create data before adding a company name. */
export function CompanyProfileRequiredDialog({
  open,
  action = "create anything",
  dismissible = true,
  onClose,
}: Props) {
  const router = useRouter();
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    if (!dismissible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="company-required-title"
      aria-describedby="company-required-description"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="fixed inset-0 bg-neutral-950/50"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-card-hover">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="company-required-title" className="text-h4 font-semibold text-neutral-900">
              Add your company name first
            </h2>
            <p id="company-required-description" className="mt-1.5 text-body-sm text-neutral-600">
              You need to add your company name in Company Settings before you can {action}. It is printed on
              every bilty and bill, and it keeps your data separate from other companies.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {dismissible ? (
            <Button variant="outline" size="sm" onClick={onClose}>
              Not now
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/dashboard")}>
              Back to dashboard
            </Button>
          )}
          <Button ref={primaryRef} size="sm" onClick={() => router.push("/admin/settings")}>
            Go to Company Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
