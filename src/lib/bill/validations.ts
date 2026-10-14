import { z } from "zod";
import { chargeLineSchema } from "@/lib/charges";

import { BILLING_PARTIES } from "@/lib/validations/billing";

/**
 * ASSUMPTIONS (please confirm / correct once backend is wired up):
 *
 * 1. The consignment's own `payment.billingParty` ("Consignor" | "Consignee" | "Third Party")
 *    decides who a bill for that consignment goes to. The FIRST consignment added to a
 *    bill sets the bill's `billedToType` + `billedTo` party details. Any later consignment
 *    added whose own billingParty differs is still allowed onto the bill (a transporter
 *    commonly bills one party for a batch of LRs), but the UI flags a soft warning.
 *
 * 2. Consignments with `payment.status === "Paid"` are excluded from the CNS picker,
 *    per your requirement.
 *
 * 3. The printed bill's charge columns don't map 1:1 to the Consignment.charges schema
 *    (which has freight / localGodownCharges / unloadingCharge / loadingCharge /
 *    codCharges / statisticalCharges / localCollectionCharges — no "LR", "Detention" or
 *    "GSTIN Charges" fields). For now:
 *      - Freight Amt       <- consignment.charges.freight
 *      - LR Charges       <- consignment.charges.localCollectionCharges
 *      - Unloading Charges <- consignment.charges.unloadingCharge
 *      - Loading Charges   <- consignment.charges.loadingCharge
 *      - Detention Charges <- not present on Consignment yet, defaults to 0, editable per row
 *      - GSTIN Charges     <- not present on Consignment yet, defaults to 0, editable per row
 *
 *    All six are editable in the bill table regardless of source, so nothing is locked in
 *    if this mapping isn't quite right.
 */

const billPartySchema = z.object({
  name: z.string().trim().min(1, "Name is required."),

  address: z.string().trim().optional().or(z.literal("")),

  city: z.string().trim().optional().or(z.literal("")),

  state: z.string().trim().optional().or(z.literal("")),

  pincode: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[0-9]{6}$/.test(v), {
      message: "PIN code must be 6 digits.",
    }),

  gstin: z.string().trim().optional().or(z.literal("")),

  mobile: z.string().trim().optional().or(z.literal("")),
});

export const billItemSchema = z.object({
  consignmentId: z.string().min(1),

  srNo: z.number().int().positive(),

  cnsNo: z.string().min(1),

  bookingStn: z.string().optional().or(z.literal("")),

  toStn: z.string().optional().or(z.literal("")),

  date: z.string().optional().or(z.literal("")),

  freightAmt: z.coerce.number().nonnegative().default(0),

  lrCharges: z.coerce.number().nonnegative().default(0),

  detentionCharges: z.coerce.number().nonnegative().default(0),

  unloadingCharges: z.coerce.number().nonnegative().default(0),

  loadingCharges: z.coerce.number().nonnegative().default(0),

  gstinCharges: z.coerce.number().nonnegative().default(0),
  chargeLines: z.array(chargeLineSchema).optional(),

  /**
   * sourceBillingParty is the billingParty stored on the consignment itself —
   * used only to power the "different billed party" warning, never submitted.
   */
  sourceBillingParty: z
    .enum(BILLING_PARTIES)
    .optional()
    .or(z.literal("")),
});

export const freightBillFormSchema = z.object({
  billStn: z.string().trim().min(1, "Bill STN is required."),

  billNo: z.string().trim().min(1, "Bill No. is required."),

  billDate: z.string().min(1, "Bill date is required."),

  billedToType: z.enum(BILLING_PARTIES),

  billedTo: billPartySchema,

  items: z
    .array(billItemSchema)
    .min(1, "Add at least one consignment to the bill."),

  remark: z.string().trim().optional().or(z.literal("")),
  vehicleNumber: z.string().trim().optional().or(z.literal("")),
});

export type FreightBillFormValues = z.infer<typeof freightBillFormSchema>;

export type BillItemValues = z.infer<typeof billItemSchema>;

export type BillPartyValues = z.infer<typeof billPartySchema>;

/**
 * Convert a charge value to number before calculation.
 *
 * This handles:
 * - number     -> number
 * - "100"      -> 100
 * - ""         -> 0
 * - undefined  -> 0
 * - null       -> 0
 * - invalid string -> 0
 */
function chargeNumber(value: number | string | null | undefined): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function computeItemTotal(item: BillItemValues): number {
  const snapshotTotal = item.chargeLines?.reduce((sum, line) => sum + chargeNumber(line.amount), 0);
  if (snapshotTotal !== undefined) return snapshotTotal;
  return (
    chargeNumber(item.freightAmt) +
    chargeNumber(item.lrCharges) +
    chargeNumber(item.detentionCharges) +
    chargeNumber(item.unloadingCharges) +
    chargeNumber(item.loadingCharges) +
    chargeNumber(item.gstinCharges)
  );
}

export const CHARGE_KEYS = [
  "freightAmt",
  "lrCharges",
  "detentionCharges",
  "unloadingCharges",
  "loadingCharges",
  "gstinCharges",
] as const;

export function computeBillTotals(items: BillItemValues[]) {
  return items.reduce(
    (acc, item) => ({
      freightAmt: acc.freightAmt + chargeNumber(item.freightAmt),

      lrCharges: acc.lrCharges + chargeNumber(item.lrCharges),

      detentionCharges:
        acc.detentionCharges + chargeNumber(item.detentionCharges),

      unloadingCharges:
        acc.unloadingCharges + chargeNumber(item.unloadingCharges),

      loadingCharges:
        acc.loadingCharges + chargeNumber(item.loadingCharges),

      gstinCharges:
        acc.gstinCharges + chargeNumber(item.gstinCharges),

      totalCharges: acc.totalCharges + computeItemTotal(item),
    }),
    {
      freightAmt: 0,
      lrCharges: 0,
      detentionCharges: 0,
      unloadingCharges: 0,
      loadingCharges: 0,
      gstinCharges: 0,
      totalCharges: 0,
    }
  );
}

/** "THIRTEEN THOUSAND ONLY" style amount-in-words, matching the printed bill. */
export function amountInWords(amount: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function inWords(num: number): string {
    if (num === 0) return "";

    if (num < 20) return a[num] + " ";

    if (num < 100) {
      return b[Math.floor(num / 10)] + " " + inWords(num % 10);
    }

    if (num < 1000) {
      return (
        a[Math.floor(num / 100)] +
        " Hundred " +
        inWords(num % 100)
      );
    }

    if (num < 100000) {
      return (
        inWords(Math.floor(num / 1000)) +
        "Thousand " +
        inWords(num % 1000)
      );
    }

    if (num < 10000000) {
      return (
        inWords(Math.floor(num / 100000)) +
        "Lakh " +
        inWords(num % 100000)
      );
    }

    return (
      inWords(Math.floor(num / 10000000)) +
      "Crore " +
      inWords(num % 10000000)
    );
  }

  const rounded = Math.round(amount);

  if (rounded === 0) return "ZERO ONLY";

  return `${inWords(rounded).trim().toUpperCase()} ONLY`;
}