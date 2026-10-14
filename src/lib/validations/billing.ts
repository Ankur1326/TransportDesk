import { z } from "zod";
import { chargeLineSchema } from "@/lib/charges";

// ─── Shared primitives ──────────────────────────────────────────────────────

/** Loose GSTIN check (15 chars, standard pattern) — kept permissive so drafts aren't blocked. */
const gstinSchema = z
  .string()
  .trim()
  // .refine((v) => v === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v), {
  //   message: "Enter a valid 15-character GSTIN.",
  // })
  .optional()
  .or(z.literal(""));

const partySchema = z.object({
  customerId: z.string().optional(),
  name: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  pincode: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[0-9]{6}$/.test(v), { message: "PIN code must be 6 digits." }),
  gstin: gstinSchema,
  mobile: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[0-9]{10}$/.test(v.replace(/\D/g, "")), {
      message: "Enter a valid 10-digit mobile number.",
    }),
  email: z.string().trim().optional().or(z.literal("")).refine((v) => !v || z.string().email().safeParse(v).success, {
    message: "Enter a valid email address.",
  }),
});

const locationSchema = z.object({
  location: z.string().trim().optional().or(z.literal("")),
  branch: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  gstin: gstinSchema,
});

// ─── Enums ───────────────────────────────────────────────────────────────────

export const PACKING_TYPES = ["Bags", "Boxes", "Cartons", "Drums", "Pallets", "Wooden box", "Machine", "Pipe", "Loose", "Other"] as const;
// export const VOLUME_UNITS = ["CFT", "CBM", "Litre", "Other"] as const;
export const WEIGHT_UNITS = ["KG", "Ton", "Gram"] as const;
export const SEGMENTS = ["FTL", "LTL", "SUN", "ODC", "MM", "SAARC", "Other"] as const;
export const LOAD_TYPES = ["Charged Weight", "Full Load", "Part Load", "Minimum Weight", "Actual Weight"] as const;
export const GST_TYPES = ["IGST", "CGST_SGST", "NONE"] as const;
export const GST_PERCENTAGES = [0, 5, 12, 18, "custom"] as const;
export const PAYMENT_TYPES = ["To Pay", "Paid", "TBB at", "Credit", "Cash", "Online", "Bank Transfer", "UPI"] as const;
export const BILLING_PARTIES = ["Consignor", "Consignee", "Third Party"] as const;
export const PAYMENT_STATUSES = ["Pending", "Partially Paid", "Paid", "Cancelled"] as const;
export const RECEIVED_TYPES = ["Cash", "NEFT", "Check", ""] as const;
// ─── Main schema ─────────────────────────────────────────────────────────────

export const billingFormSchema = z.object({
  consignmentNumber: z.string().trim().min(1, "Consignment number is required."),
  bookingDate: z.string().optional().or(z.literal("")),
  cnsDate: z.string().optional().or(z.literal("")),
  eWayBillNumber: z.string().trim().optional().or(z.literal("")),
  validUpTo: z.string().optional().or(z.literal("")),
  invoiceNumber: z.string().trim().optional().or(z.literal("")),
  invoiceDate: z.string().optional().or(z.literal("")),
  vehicleNumber: z.string().trim().optional().or(z.literal("")),

  from: locationSchema,
  to: locationSchema,

  consignor: partySchema,
  consignee: partySchema,

  shipment: z.object({
    packages: z.string().optional().or(z.literal("")),
    packing: z.enum(PACKING_TYPES).optional().or(z.literal("")),
    description: z.string().trim().optional().or(z.literal("")),
    classification: z.string().trim().optional().or(z.literal("")),
    declaredValue: z.string().optional().or(z.literal("")),
    invoiceNumber: z.string().trim().optional().or(z.literal("")),
    volume: z.string().trim().optional().or(z.literal("")),
    // volumeUnit: z.enum(VOLUME_UNITS),
    actualWeight: z.string().optional().or(z.literal("")),
    chargeWeight: z.string().optional().or(z.literal(""))
  }),

  segment: z.enum(SEGMENTS).optional().or(z.literal("")),
  loadType: z.enum(LOAD_TYPES).optional().or(z.literal("")),

  vehicle: z.object({
    driverName: z.string().trim().optional().or(z.literal("")),
    driverMobile: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || /^[0-9]{10}$/.test(v.replace(/\D/g, "")), { message: "Enter a valid 10-digit mobile number." }),
    transportMode: z.string().trim().optional().or(z.literal("")),
    branch: z.string().trim().optional().or(z.literal("")),
    deliveryBranch: z.string().trim().optional().or(z.literal("")),
    route: z.string().trim().optional().or(z.literal("")),
    expectedDeliveryDate: z.string().optional().or(z.literal("")),
  }),

  charges: z.object({
    freight: z.coerce.number().nonnegative("Freight cannot be negative.").default(0),
    localGodownCharges: z.coerce.number().nonnegative().default(0),
    unloadingCharge: z.coerce.number().nonnegative().default(0),
    loadingCharge: z.coerce.number().nonnegative().default(0),
    codCharges: z.coerce.number().nonnegative().default(0),
    statisticalCharges: z.coerce.number().nonnegative().default(0),
    localCollectionCharges: z.coerce.number().nonnegative().default(0),
    printHidden: z.boolean().default(false),
    chargeLines: z.array(chargeLineSchema).optional(),
  }),

  tax: z.object({
    type: z.enum(GST_TYPES).optional().or(z.literal("")),
    percentage: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal("custom")]).optional().or(z.literal("")),
    customPercentage: z.coerce.number().min(0).max(100).optional(),
  }),

  payment: z.object({
    type: z.enum(PAYMENT_TYPES).optional().or(z.literal("")),
    billingParty: z.enum(BILLING_PARTIES).optional().or(z.literal("")),
    billingAccount: z.string().trim().optional().or(z.literal("")),
    status: z.enum(PAYMENT_STATUSES).optional().or(z.literal("")),
    receivedType: z.enum(RECEIVED_TYPES).optional().or(z.literal("")),
    receivedMoney: z.string().optional().or(z.literal("")),
    receivedDate: z.string().optional().or(z.literal("")),
    UTRNumber: z.string().optional().or(z.literal("")),
    mrNumber: z.string().optional().or(z.literal("")),
    mrDate: z.string().optional().or(z.literal("")),
  }),

  insurance: z.object({
    required: z.boolean().default(false),
    company: z.string().trim().optional().or(z.literal("")),
    policyNumber: z.string().trim().optional().or(z.literal("")),
    amount: z.coerce.number().nonnegative().optional(),
    date: z.string().optional().or(z.literal(null)),
    riskType: z.string().trim().optional().or(z.literal("")),
  }),

  remarks: z.string().trim().optional().or(z.literal("")),
  internalNotes: z.string().trim().optional().or(z.literal("")),
  specialInstructions: z.string().trim().optional().or(z.literal("")),
});

export type BillingFormValues = z.infer<typeof billingFormSchema>;
export type PartyValues = z.infer<typeof partySchema>;
export type LocationValues = z.infer<typeof locationSchema>;

// ─── Default values ──────────────────────────────────────────────────────────

const emptyParty: PartyValues = {
  customerId: "",
  name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstin: "",
  mobile: "",
  email: "",
};

const emptyLocation: LocationValues = {
  location: "",
  branch: "",
  state: "",
  gstin: "",
};

export function buildDefaultValues(consignmentNumber: string): BillingFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    consignmentNumber,
    bookingDate: today,
    cnsDate: today,
    eWayBillNumber: "",
    validUpTo: "",
    invoiceNumber: "",
    invoiceDate: "",
    vehicleNumber: "",
    from: { ...emptyLocation },
    to: { ...emptyLocation },
    consignor: { ...emptyParty },
    consignee: { ...emptyParty },
    shipment: {
      packages: "",
      packing: "Bags",
      description: "",
      classification: "",
      declaredValue: "",
      invoiceNumber: "",
      volume: "",
      // volumeUnit: "CFT",
      actualWeight: "",
      chargeWeight: "",
    },
    segment: "FTL",
    loadType: "Actual Weight",
    vehicle: {
      driverName: "",
      driverMobile: "",
      transportMode: "Road",
      branch: "",
      deliveryBranch: "",
      route: "",
      expectedDeliveryDate: "",
    },
    charges: {
      freight: 0,
      localGodownCharges: 0,
      unloadingCharge: 0,
      loadingCharge: 0,
      codCharges: 0,
      statisticalCharges: 0,
      localCollectionCharges: 0,
      printHidden: false,
      chargeLines: [],
    },
    tax: { type: "NONE", percentage: "", customPercentage: undefined },
    payment: { type: "", billingParty: "Consignor", billingAccount: "", status: "Pending", receivedType: "", UTRNumber: "", receivedMoney: "", receivedDate: "", mrNumber: "", mrDate: "" },
    insurance: { required: false, company: "", policyNumber: "", amount: 0, date: null, riskType: "" },
    remarks: "",
    internalNotes: "",
    specialInstructions: "",
  };
}