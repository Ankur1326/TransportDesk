/**
 * Supplier master validation (zod), shared by the create and update routes.
 *
 * Only keys that were sent end up in the output, so an update that omits
 * (say) the bank block leaves the stored bank alone, while an empty string
 * clears a field on purpose.
 */
import { z } from "zod";
import { GSTIN_REGEX, IFSC_REGEX, PAN_REGEX, SUPPLIER_TYPES } from "@/lib/lorry-hire/constants";
import { isValidIndianMobile } from "@/lib/lorry-hire/validations";

const optText = (max: number) => z.string().trim().max(max).optional();

const upper = (max: number, regex: RegExp, message: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .max(max)
    .refine((v) => v === "" || regex.test(v), { message })
    .optional();

export const supplierBankSchema = z
  .object({
    accountHolderName: optText(160),
    bankName: optText(160),
    accountNumber: optText(34),
    ifscCode: upper(11, IFSC_REGEX, "IFSC must look like HDFC0001234."),
    upiId: optText(100),
  })
  .strip();

export const supplierInputSchema = z.object({
  name: z.string().trim().min(2, "Supplier name must be at least 2 characters.").max(100, "Supplier name is too long."),
  address: optText(300),
  city: optText(100),
  state: optText(100),
  pincode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9]{6}$/.test(v), { message: "PIN code must be 6 digits." })
    .optional(),
  gstin: upper(15, GSTIN_REGEX, "GSTIN must be 15 characters, like 24ABCDE1234F1Z5."),
  mobile: z
    .string()
    .trim()
    .nullable()
    .refine((v) => !v || isValidIndianMobile(v), { message: "Enter a valid 10-digit mobile number." })
    .optional(),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, { message: "Enter a valid email address." })
    .optional(),
  // Lorry hire details
  panNumber: upper(10, PAN_REGEX, "PAN must look like ABCDE1234F."),
  supplierType: z.enum(SUPPLIER_TYPES).optional(),
  defaultTdsRate: z.coerce.number().min(0, "TDS rate can't be negative.").max(100, "TDS rate can't be above 100.").nullable().optional(),
  tdsDeclaration: z.boolean().optional(),
  bankDetails: supplierBankSchema.optional(),
});

export type SupplierInput = z.output<typeof supplierInputSchema>;

/** Parse a request body; on failure returns the first message to show the user. */
export function parseSupplierInput(body: unknown): { ok: true; data: SupplierInput } | { ok: false; message: string } {
  const parsed = supplierInputSchema.safeParse(body);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid supplier details." };
}

/**
 * Dotted `$set` paths for a partial update. Nested bank fields are set one by
 * one so sending just the UPI id never wipes the account number.
 */
export function supplierSetFields(data: SupplierInput): Record<string, unknown> {
  const { bankDetails, ...flat } = data;
  const set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value === undefined) continue;
    // A cleared TDS rate means "no default" and is removed (see supplierUnsetFields), never stored as 0%.
    if (key === "defaultTdsRate" && value === null) continue;
    set[key] = key === "mobile" ? (value ? String(value) : null) : value;
  }
  if (bankDetails) {
    for (const [key, value] of Object.entries(bankDetails)) {
      if (value !== undefined) set[`bankDetails.${key}`] = value;
    }
  }
  return set;
}

/** Fields to remove: currently only a cleared default TDS rate. */
export function supplierUnsetFields(data: SupplierInput): Record<string, ""> {
  return data.defaultTdsRate === null ? { defaultTdsRate: "" } : {};
}
