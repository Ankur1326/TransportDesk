import { NextResponse } from "next/server";
import { resolveCompanyAuth } from "@/lib/company-auth";
import dbConnect from "@/lib/db";
import CompanySettings from "@/models/CompanySettings";
import { ALLOW_LEGACY_UNSCOPED, companyFilter } from "@/lib/company-filter";

export { ALLOW_LEGACY_UNSCOPED, companyFilter };

export type CompanyAuth =
  | { ok: true; companyId: string; userId: string }
  | { ok: false; response: NextResponse };

/** Resolve the signed-in company (+ acting user) or a ready-made 401 response. */
export async function requireCompany(): Promise<CompanyAuth> {
  const auth = await resolveCompanyAuth();
  switch (auth.status) {
    case "ok":
      return { ok: true, companyId: auth.companyId, userId: auth.userId };
    case "not_approved":
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, code: "ACCOUNT_NOT_APPROVED", message: "Your account is waiting for approval." },
          { status: 403 }
        ),
      };
    case "company_setup_failed":
      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            code: "COMPANY_SETUP_FAILED",
            message: "We couldn't set up your company account. Please try again in a moment.",
          },
          { status: 500 }
        ),
      };
    default:
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, code: "UNAUTHENTICATED", message: "Unauthorized" },
          { status: 401 }
        ),
      };
  }
}

/**
 * Like requireCompany(), but also refuses (403 COMPANY_PROFILE_REQUIRED) until
 * the company has saved a company name in Settings. Use on every route that
 * CREATES data (customers, bills, bilty) so it can't be bypassed from the UI.
 */
export async function requireCompanyProfile(): Promise<CompanyAuth> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  await dbConnect();
  const settings = (await CompanySettings.findOne({ ownerId: auth.companyId })
    .select("companyName")
    .lean()) as { companyName?: string } | null;

  if (!settings?.companyName?.trim()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          code: "COMPANY_PROFILE_REQUIRED",
          message: "Add your company name in Settings before creating bilties, bills or customers.",
        },
        { status: 403 }
      ),
    };
  }
  return auth;
}
