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

  country: z.string().trim().optional().or(z.literal("")),

  email: z.string().trim().optional().or(z.literal("")),
});

export const GST_MODES = ["None", "GST", "RCM"] as const;
export const TDS_MODES = ["Deduction", "Addition"] as const;
export const ADVANCE_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque"] as const;
export const GST_RATE_OPTIONS = [0, 5, 12, 18, 28] as const;
export const TDS_RATE_OPTIONS = [0, 0.1, 1, 2, 5, 10] as const;
/** Reverse-charge freight GST is a flat 5%. */
export const RCM_RATE = 5;

/** Discount / tax / TDS / advance block shown on the right of the bill form. All optional. */
export const billAdjustmentsSchema = z.object({
  discount: z.coerce.number().nonnegative().default(0),
  gstMode: z.enum(GST_MODES).default("None"),
  gstRate: z.coerce.number().min(0).max(100).default(0),
  tdsMode: z.enum(TDS_MODES).default("Deduction"),
  tdsRate: z.coerce.number().min(0).max(100).default(0),
  roundOff: z.boolean().default(false),
  advanceReceived: z.coerce.number().nonnegative().default(0),
  advanceDate: z.string().optional().or(z.literal("")),
  advanceVia: z.enum(ADVANCE_MODES).default("Cash"),
});

export const billBankDetailsSchema = z.object({
  accountHolderName: z.string().trim().optional().or(z.literal("")),
  bankName: z.string().trim().optional().or(z.literal("")),
  accountNumber: z.string().trim().optional().or(z.literal("")),
  ifscCode: z.string().trim().optional().or(z.literal("")),
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
  billStn: z.string().trim().optional().or(z.literal("")),

  billNo: z.string().trim().min(1, "Bill No. is required."),

  billDate: z.string().min(1, "Bill date is required."),

  billedToType: z.enum(BILLING_PARTIES),

  billedTo: billPartySchema,

  items: z
    .array(billItemSchema)
    .min(1, "Add at least one consignment to the bill."),

  remark: z.string().trim().optional().or(z.literal("")),
  vehicleNumber: z.string().trim().optional().or(z.literal("")),

  hsnCode: z.string().trim().optional().or(z.literal("")),
  bankDetails: billBankDetailsSchema.optional(),
  adjustments: billAdjustmentsSchema.optional(),
});

export type FreightBillFormValues = z.infer<typeof freightBillFormSchema>;

export type BillItemValues = z.infer<typeof billItemSchema>;

export type BillPartyValues = z.infer<typeof billPartySchema>;

export type BillAdjustments = z.infer<typeof billAdjustmentsSchema>;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

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

/**
 * Money maths for the summary panel. Used by the form AND re-run on the server
 * when a bill is saved, so the stored totals can't be tampered with.
 *
 *   taxable   = trip total - discount
 *   GST       = added to the invoice (RCM tax is paid by the recipient, so it is shown but not added)
 *   TDS       = deducted from (or added to) the taxable value
 *   invoice   = taxable + GST ± TDS, optionally rounded to a whole rupee
 *   payable   = invoice - advance received
 */
export function computeBillSummary(tripTotal: number, adjustments?: Partial<BillAdjustments>) {
  const trip = round2(chargeNumber(tripTotal));
  const discount = round2(Math.min(Math.max(chargeNumber(adjustments?.discount), 0), trip));
  const taxable = round2(trip - discount);

  const gstMode = adjustments?.gstMode ?? "None";
  const gstRate = gstMode === "GST" ? chargeNumber(adjustments?.gstRate) : gstMode === "RCM" ? RCM_RATE : 0;
  const gstAmount = round2((taxable * gstRate) / 100);
  const gstAdded = gstMode === "GST" ? gstAmount : 0;

  const tdsAmount = round2((taxable * chargeNumber(adjustments?.tdsRate)) / 100);
  const tdsSigned = adjustments?.tdsMode === "Addition" ? tdsAmount : -tdsAmount;

  const beforeRound = taxable + gstAdded + tdsSigned;
  const invoiceAmount = adjustments?.roundOff ? Math.round(beforeRound) : round2(beforeRound);
  const roundOffAmount = round2(invoiceAmount - beforeRound);

  const advance = Math.max(chargeNumber(adjustments?.advanceReceived), 0);
  const payable = Math.max(0, round2(invoiceAmount - advance));

  return { trip, discount, taxable, gstMode, gstRate, gstAmount, gstAdded, tdsAmount, tdsSigned, roundOffAmount, invoiceAmount, advance, payable };
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