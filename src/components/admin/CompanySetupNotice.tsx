"use client";

import Link from "next/link";
import { Building2 } from "@/components/icons";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getMissingCompanyFields } from "@/lib/company-settings";

/**
 * Banner for list pages (bilties, bills, customers…). Shows only when this
 * company hasn't filled in its details yet, and links straight to Settings.
 * Renders nothing while loading, once the profile is complete, or if the
 * settings couldn't be loaded (the page's own error state covers that).
 */
export function CompanySetupNotice({ className = "" }: { className?: string }) {
  const { settings, hasLoaded, error } = useCompanySettings();
  if (!hasLoaded || error) return null;

  const missing = getMissingCompanyFields(settings);
  if (missing.length === 0) return null;

  const shown = missing.slice(0, 3).join(", ");
  const more = missing.length > 3 ? ` and ${missing.length - 3} more` : "";

  return (
    <div
      role="status"
      className={`flex flex-col gap-3 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-start gap-3">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
        <div>
          <p className="text-body-sm font-semibold text-neutral-900">Add your company details</p>
          <p className="text-body-sm text-neutral-600">
            Your company name appears on every bilty and bill. Still missing: {shown}
            {more}.
          </p>
        </div>
      </div>
      <Link
        href="/admin/settings"
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-brand-900 px-4 text-sm font-semibold text-white hover:bg-brand-800"
      >
        Add company details
      </Link>
    </div>
  );
}
