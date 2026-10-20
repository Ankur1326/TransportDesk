"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/ui/Loading";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { CompanyProfileRequiredDialog } from "@/components/admin/CompanyProfileRequiredDialog";

interface Props {
  children: ReactNode;
  /** What this page creates, for the message — e.g. "create a bilty". */
  action: string;
  /** Query param that means "editing an existing record" (e.g. "id"): those pages are not blocked. */
  editParam?: string;
}

/**
 * Wrap a "create" page. Until the company has a company name saved in
 * Settings, the form is not rendered and a box that can't be dismissed sends
 * the person to Settings. Editing an existing record is never blocked.
 * Must be rendered inside <Suspense> (it reads the query string).
 *
 * If the settings can't be loaded we let the form show: the API enforces the
 * same rule and will explain it if they try to save.
 */
export function CompanyProfileGate({ children, action, editParam }: Props) {
  const searchParams = useSearchParams();
  const { settings, hasLoaded, error } = useCompanySettings();

  const isEditing = Boolean(editParam && searchParams.get(editParam));
  if (isEditing) return <>{children}</>;

  if (!hasLoaded) return <Loading fullPage label="Loading…" />;

  const missingName = !error && !settings.companyName.trim();
  if (missingName) return <CompanyProfileRequiredDialog open dismissible={false} action={action} />;

  return <>{children}</>;
}
