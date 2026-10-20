import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { ensureUserCompany } from "@/lib/company-provision";

export interface AuthenticatedCompany {
  /** The tenant. ALL data scoping (customers, bills, bilty, settings) uses this. */
  companyId: string;
  /** The person who is acting. Use only for audit fields (createdBy, statusHistory.by). */
  userId: string;
}

export type CompanyAuthResult =
  | ({ status: "ok" } & AuthenticatedCompany)
  | { status: "unauthenticated" }
  | { status: "not_approved" }
  | { status: "company_setup_failed" };

/**
 * Works out who is calling and which company they belong to, and says WHY when
 * it can't — so the API can answer "sign in", "awaiting approval" or "we
 * couldn't set up your company" instead of one vague 401.
 *
 * A signed-in user whose session has no companyId yet (account created before
 * companies existed, or the session callback couldn't provision it) is linked
 * to a company right here, so this never depends on the session callback.
 * "Company details not filled in" (name, address…) is NOT an error: that is
 * only the optional settings profile, and the lists simply load empty.
 */
export async function resolveCompanyAuth(): Promise<CompanyAuthResult> {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { _id?: unknown; companyId?: unknown; role?: unknown; isApproved?: unknown }
    | undefined;

  if (user?.role !== "transporter" || typeof user._id !== "string" || !user._id) {
    return { status: "unauthenticated" };
  }
  if (user.isApproved !== true) return { status: "not_approved" };

  if (typeof user.companyId === "string" && user.companyId) {
    return { status: "ok", companyId: user.companyId, userId: user._id };
  }

  try {
    const companyId = await ensureUserCompany(user._id);
    return { status: "ok", companyId, userId: user._id };
  } catch (error) {
    console.error("Could not provision a company for user", user._id, error);
    return { status: "company_setup_failed" };
  }
}

export async function getAuthenticatedCompany(): Promise<AuthenticatedCompany | null> {
  const result = await resolveCompanyAuth();
  return result.status === "ok" ? { companyId: result.companyId, userId: result.userId } : null;
}

export async function getAuthenticatedCompanyId(): Promise<string | null> {
  return (await getAuthenticatedCompany())?.companyId ?? null;
}
