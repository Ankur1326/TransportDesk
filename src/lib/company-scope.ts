import { NextResponse } from "next/server";
import { getAuthenticatedCompanyId } from "@/lib/company-auth";

/**
 * Consignments created before multi-tenant scoping have no `companyId`.
 * While this is true they stay visible to every approved transporter so
 * nothing disappears after deploy. Run `scripts/backfill-company-id.mjs`
 * and then flip this to `false` to lock each company to its own data.
 */
export const ALLOW_LEGACY_UNSCOPED = true;

export type CompanyAuth =
  | { ok: true; companyId: string }
  | { ok: false; response: NextResponse };

/** Resolve the signed-in company or a ready-made 401 response. */
export async function requireCompany(): Promise<CompanyAuth> {
  const companyId = await getAuthenticatedCompanyId();
  if (!companyId) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, companyId };
}

/** Mongo filter limiting a query to one company's consignments. */
export function companyFilter(companyId: string): Record<string, unknown> {
  return ALLOW_LEGACY_UNSCOPED
    ? { $or: [{ companyId }, { companyId: { $exists: false } }, { companyId: null }, { companyId: "" }] }
    : { companyId };
}
