import { DEFAULT_COMPANY_SETTINGS, DEFAULT_FIELD_VISIBILITY, type CompanySettingsValues } from "@/lib/company-settings";
import dbConnect from "@/lib/db";
import CompanySettings from "@/models/CompanySettings";

/**
 * Saved settings for one company merged over the defaults — the same shape
 * `GET /api/admin/settings` returns. Server-only.
 */
export async function loadCompanySettings(ownerId: string): Promise<CompanySettingsValues> {
  await dbConnect();
  const settings = await CompanySettings.findOne({ ownerId })
    .select("-_id -ownerId -createdAt -updatedAt -__v")
    .lean();

  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...settings,
    fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY, ...settings?.fieldVisibility },
    lrFormatBackgrounds: {
      ...DEFAULT_COMPANY_SETTINGS.lrFormatBackgrounds,
      ...settings?.lrFormatBackgrounds,
    },
    chargeDefinitions:
      settings?.chargeDefinitions?.map((charge) => ({
        ...charge,
        defaultAmount: charge.defaultAmount === 0 ? null : charge.defaultAmount,
      })) ?? DEFAULT_COMPANY_SETTINGS.chargeDefinitions,
  } as CompanySettingsValues;
}
