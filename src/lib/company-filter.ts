/**
 * Pure tenant filter shared by route auth helpers and server-side loaders.
 * Legacy unscoped documents must never be exposed across company boundaries.
 */
export const ALLOW_LEGACY_UNSCOPED = false;

export function companyFilter(companyId: string): Record<string, unknown> {
  return ALLOW_LEGACY_UNSCOPED
    ? { $or: [{ companyId }, { companyId: { $exists: false } }, { companyId: null }, { companyId: "" }] }
    : { companyId };
}
