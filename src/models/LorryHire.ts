import mongoose, { model, Schema, Document, Model } from "mongoose";

import { dropStaleModel } from "@/lib/model-guard";
import {
  CHARGE_KINDS,
  DEFAULT_LORRY_HIRE_STATUS,
  FREIGHT_PAID_BY,
  GST_MODES,
  LOAD_TYPES,
  LORRY_HIRE_STATUSES,
  PAYMENT_KINDS,
  PAYMENT_MODES,
  PAYMENT_STATUSES,
  RATE_MODES,
  SUPPLIER_TYPES,
  TDS_MODES,
  TDS_SECTIONS,
  WEIGHT_UNITS,
  type ChargeKind,
  type FreightPaidBy,
  type GstMode,
  type LorryHireLoadType,
  type LorryHirePaymentKind,
  type LorryHirePaymentStatus,
  type LorryHireStatus,
  type PaymentMode,
  type RateMode,
  type SupplierType,
  type TdsMode,
  type TdsSection,
  type WeightUnit,
} from "@/lib/lorry-hire/constants";

/**
 * Lorry Hire Contract (LHC) — the paper "Lorry Hire Contract / Truck Supplier
 * Note" we issue when we hire a truck from a broker or owner.
 *
 * Design notes
 *  - Party details (supplier, owner, driver) are SNAPSHOTS copied onto the
 *    contract, so editing the Supplier master later never rewrites an issued
 *    contract (same idea as `billedTo` on freight bills).
 *  - `payments[]` is the contract's own settlement record and is what the
 *    totals and the printed sheet are computed from. Each entry also points at
 *    a row in the `Payment` collection (`ledgerPaymentId`) so supplier-ledger
 *    reporting has a single place to read from (wired up in Phase 2).
 *  - All money totals (`grossHire` … `balance`) are SERVER-DERIVED from the
 *    inputs via lib/lorry-hire/calculations.ts — never trusted from a client.
 */

// ─── Sub-document interfaces ────────────────────────────────────────────────

export interface ILorryHirePlace {
  location: string;
  state?: string;
}

export interface ILorryHireSupplier {
  supplierId?: mongoose.Types.ObjectId;
  name: string;
  supplierType: SupplierType;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  mobile?: string;
}

export interface ILorryHireOwner {
  sameAsSupplier: boolean;
  name?: string;
  mobile?: string;
  pan?: string;
  address?: string;
}

export interface ILorryHireDriver {
  name?: string;
  mobile?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
}

export interface ILorryHireTruck {
  vehicleNumber: string;
  truckType?: string;
  capacity: number;
  capacityUnit: WeightUnit;
  chassisNo?: string;
  engineNo?: string;
  permitNo?: string;
  isOversize: boolean;
}

export interface ILorryHireInsurance {
  company?: string;
  policyNumber?: string;
  validUpto?: Date;
}

export interface ILorryHireItem {
  consignmentId?: mongoose.Types.ObjectId;
  cnNo: string;
  cnDate?: Date;
  from?: string;
  to?: string;
  description?: string;
  packages: number;
  actualWeight: number;
  chargedWeight: number;
}

export interface ILorryChargeLine {
  chargeId: string;
  name: string;
  kind: ChargeKind;
  amount: number;
}

export interface ILorryHireFreight {
  rateMode: RateMode;
  rate: number;
  freightPaidBy: FreightPaidBy;
}

export interface ILorryHireTax {
  gstMode: GstMode;
  gstRate: number;
  tdsMode: TdsMode;
  tdsRate: number;
  tdsSection: TdsSection;
  roundOff: boolean;
}

export interface ILorryHireShortage {
  amount: number;
  quantity: number;
  unit: WeightUnit;
  note?: string;
}

export interface ILorryHireBank {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface ILorryHirePayment {
  /** Stable id of this entry within the contract (subdocument _id). */
  _id?: mongoose.Types.ObjectId;
  kind: LorryHirePaymentKind;
  amount: number;
  date: Date;
  mode: PaymentMode;
  reference?: string;
  paidTo?: string;
  remark?: string;
  /** Mirror row in the `Payment` collection (supplier ledger). Set in Phase 2. */
  ledgerPaymentId?: mongoose.Types.ObjectId;
}

export interface ILorryHireSettlement {
  /** Cargo totals across `items`. */
  totalPackages: number;
  totalActualWeight: number;
  totalChargedWeight: number;
  /** tonnes / kg / packages the rate was applied to (1 for "Fixed"). */
  freightQuantity: number;
  basicFreight: number;
  additions: number;
  deductions: number;
  /** Basic freight + additions − deductions. */
  grossHire: number;
  gstAmount: number;
  tdsAmount: number;
  roundOffAmount: number;
  netPayable: number;
  totalPaid: number;
  balance: number;
  paymentStatus: LorryHirePaymentStatus;
}

export interface ILorryHireStatusEntry {
  status: LorryHireStatus;
  at: Date;
  by?: string;
  note?: string;
}

export interface ILorryHire extends Document {
  lhcNo: string;
  lhcDate: Date;
  loadingDate?: Date;
  expectedDeliveryDate?: Date;
  transitDays: number;

  loadType: LorryHireLoadType;
  from: ILorryHirePlace;
  to: ILorryHirePlace;
  via?: string;

  supplier: ILorryHireSupplier;
  owner: ILorryHireOwner;
  driver: ILorryHireDriver;
  truck: ILorryHireTruck;
  insurance: ILorryHireInsurance;

  weightUnit: WeightUnit;
  items: ILorryHireItem[];

  freight: ILorryHireFreight;
  charges: ILorryChargeLine[];
  tax: ILorryHireTax;
  shortage: ILorryHireShortage;
  settlement: ILorryHireSettlement;
  payments: ILorryHirePayment[];

  bank?: ILorryHireBank;

  remarks?: string;
  internalNotes?: string;
  preparedBy?: string;
  passedBy?: string;
  /** Driver's drawn signature (PNG/JPEG data URL). */
  driverSignature?: string;

  status: LorryHireStatus;
  statusHistory?: ILorryHireStatusEntry[];
  cancelledAt?: Date;
  cancelReason?: string;

  /** Stored PDFs by variant (e.g. "default", "office,driver"). See src/lib/pdf-cache.ts. */
  pdfCache?: Record<string, { url: string; publicId: string; sourceUpdatedAt: string }>;

  companyId: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const placeSchema = new Schema<ILorryHirePlace>(
  {
    location: { type: String, required: [true, "Location is required"], trim: true, maxlength: 120 },
    state: { type: String, default: "", trim: true, maxlength: 100 },
  },
  { _id: false }
);

const supplierSchema = new Schema<ILorryHireSupplier>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    name: { type: String, required: [true, "Supplier name is required"], trim: true, maxlength: 100 },
    supplierType: { type: String, enum: SUPPLIER_TYPES, default: "Broker" },
    address: { type: String, default: "", maxlength: 300 },
    city: { type: String, default: "", maxlength: 100 },
    state: { type: String, default: "", maxlength: 100 },
    pincode: { type: String, default: "", maxlength: 6 },
    gstin: { type: String, default: "", uppercase: true, maxlength: 15 },
    pan: { type: String, default: "", uppercase: true, maxlength: 10 },
    mobile: { type: String, default: "", maxlength: 20 },
  },
  { _id: false }
);

const ownerSchema = new Schema<ILorryHireOwner>(
  {
    sameAsSupplier: { type: Boolean, default: false },
    name: { type: String, default: "", trim: true, maxlength: 100 },
    mobile: { type: String, default: "", maxlength: 20 },
    pan: { type: String, default: "", uppercase: true, maxlength: 10 },
    address: { type: String, default: "", maxlength: 300 },
  },
  { _id: false }
);

const driverSchema = new Schema<ILorryHireDriver>(
  {
    name: { type: String, default: "", trim: true, maxlength: 100 },
    mobile: { type: String, default: "", maxlength: 20 },
    licenseNumber: { type: String, default: "", trim: true, maxlength: 30 },
    licenseExpiry: { type: Date },
  },
  { _id: false }
);

const truckSchema = new Schema<ILorryHireTruck>(
  {
    vehicleNumber: { type: String, required: [true, "Vehicle number is required"], trim: true, uppercase: true, maxlength: 12 },
    truckType: { type: String, default: "", trim: true, maxlength: 60 },
    capacity: { type: Number, default: 0, min: 0 },
    capacityUnit: { type: String, enum: WEIGHT_UNITS, default: "MTS" },
    chassisNo: { type: String, default: "", trim: true, maxlength: 40 },
    engineNo: { type: String, default: "", trim: true, maxlength: 40 },
    permitNo: { type: String, default: "", trim: true, maxlength: 40 },
    isOversize: { type: Boolean, default: false },
  },
  { _id: false }
);

const insuranceSchema = new Schema<ILorryHireInsurance>(
  {
    company: { type: String, default: "", trim: true, maxlength: 100 },
    policyNumber: { type: String, default: "", trim: true, maxlength: 60 },
    validUpto: { type: Date },
  },
  { _id: false }
);

const itemSchema = new Schema<ILorryHireItem>(
  {
    consignmentId: { type: Schema.Types.ObjectId, ref: "Consignment" },
    cnNo: { type: String, required: [true, "CN number is required"], trim: true, maxlength: 40 },
    cnDate: { type: Date },
    from: { type: String, default: "", trim: true, maxlength: 120 },
    to: { type: String, default: "", trim: true, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 300 },
    packages: { type: Number, default: 0, min: 0 },
    actualWeight: { type: Number, default: 0, min: 0 },
    chargedWeight: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const chargeLineSchema = new Schema<ILorryChargeLine>(
  {
    chargeId: { type: String, required: true, maxlength: 48 },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    kind: { type: String, enum: CHARGE_KINDS, required: true },
    amount: { type: Number, required: true, min: 0, max: 1_000_000_000 },
  },
  { _id: false }
);

const freightSchema = new Schema<ILorryHireFreight>(
  {
    rateMode: { type: String, enum: RATE_MODES, default: "Fixed" },
    rate: { type: Number, default: 0, min: 0 },
    freightPaidBy: { type: String, enum: FREIGHT_PAID_BY, default: "Transporter" },
  },
  { _id: false }
);

const taxSchema = new Schema<ILorryHireTax>(
  {
    gstMode: { type: String, enum: GST_MODES, default: "None" },
    gstRate: { type: Number, default: 0, min: 0, max: 100 },
    tdsMode: { type: String, enum: TDS_MODES, default: "Deduction" },
    tdsRate: { type: Number, default: 0, min: 0, max: 100 },
    tdsSection: { type: String, enum: TDS_SECTIONS, default: "194C" },
    roundOff: { type: Boolean, default: false },
  },
  { _id: false }
);

const shortageSchema = new Schema<ILorryHireShortage>(
  {
    amount: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, enum: WEIGHT_UNITS, default: "KGS" },
    note: { type: String, default: "", maxlength: 300 },
  },
  { _id: false }
);

const settlementSchema = new Schema<ILorryHireSettlement>(
  {
    totalPackages: { type: Number, default: 0, min: 0 },
    totalActualWeight: { type: Number, default: 0, min: 0 },
    totalChargedWeight: { type: Number, default: 0, min: 0 },
    freightQuantity: { type: Number, default: 0, min: 0 },
    basicFreight: { type: Number, default: 0, min: 0 },
    additions: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    grossHire: { type: Number, default: 0, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    tdsAmount: { type: Number, default: 0, min: 0 },
    // May be negative (rounding down).
    roundOffAmount: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "Unpaid" },
  },
  { _id: false }
);

const bankSchema = new Schema<ILorryHireBank>(
  {
    accountHolderName: { type: String, default: "", trim: true, maxlength: 160 },
    bankName: { type: String, default: "", trim: true, maxlength: 160 },
    accountNumber: { type: String, default: "", trim: true, maxlength: 34 },
    ifscCode: { type: String, default: "", trim: true, uppercase: true, maxlength: 11 },
    upiId: { type: String, default: "", trim: true, maxlength: 100 },
  },
  { _id: false }
);

// Payments keep their own _id so one entry can be removed / mirrored precisely.
const paymentSchema = new Schema<ILorryHirePayment>({
  kind: { type: String, enum: PAYMENT_KINDS, default: "Advance" },
  amount: { type: Number, required: true, min: [0.01, "Amount must be greater than 0"] },
  date: { type: Date, required: true },
  mode: { type: String, enum: PAYMENT_MODES, default: "Cash" },
  reference: { type: String, default: "", trim: true, maxlength: 100 },
  paidTo: { type: String, default: "", trim: true, maxlength: 100 },
  remark: { type: String, default: "", trim: true, maxlength: 500 },
  ledgerPaymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
});

const statusEntrySchema = new Schema<ILorryHireStatusEntry>(
  {
    status: { type: String, enum: LORRY_HIRE_STATUSES, required: true },
    at: { type: Date, required: true },
    by: { type: String },
    note: { type: String, maxlength: 300 },
  },
  { _id: false }
);

// ─── Main schema ─────────────────────────────────────────────────────────────

const lorryHireSchema = new Schema<ILorryHire>(
  {
    lhcNo: { type: String, required: [true, "LHC number is required"], trim: true, maxlength: 40 },
    lhcDate: { type: Date, required: true },
    loadingDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    transitDays: { type: Number, default: 0, min: 0, max: 365 },

    loadType: { type: String, enum: LOAD_TYPES, default: "Full Load" },
    from: { type: placeSchema, required: true },
    to: { type: placeSchema, required: true },
    via: { type: String, default: "", trim: true, maxlength: 120 },

    supplier: { type: supplierSchema, required: true },
    owner: { type: ownerSchema, default: () => ({}) },
    driver: { type: driverSchema, default: () => ({}) },
    truck: { type: truckSchema, required: true },
    insurance: { type: insuranceSchema, default: () => ({}) },

    weightUnit: { type: String, enum: WEIGHT_UNITS, default: "MTS" },
    items: { type: [itemSchema], default: [] },

    freight: { type: freightSchema, default: () => ({}) },
    charges: { type: [chargeLineSchema], default: [] },
    tax: { type: taxSchema, default: () => ({}) },
    shortage: { type: shortageSchema, default: () => ({}) },
    settlement: { type: settlementSchema, default: () => ({}) },
    payments: { type: [paymentSchema], default: [] },

    bank: { type: bankSchema, default: undefined },

    remarks: { type: String, default: "", maxlength: 1000 },
    internalNotes: { type: String, default: "", maxlength: 1000 },
    preparedBy: { type: String, default: "", trim: true, maxlength: 100 },
    passedBy: { type: String, default: "", trim: true, maxlength: 100 },
    driverSignature: { type: String, default: "", maxlength: 350000 },

    status: { type: String, enum: LORRY_HIRE_STATUSES, default: DEFAULT_LORRY_HIRE_STATUS },
    statusHistory: { type: [statusEntrySchema], default: undefined },
    cancelledAt: { type: Date },
    cancelReason: { type: String, maxlength: 300 },

    pdfCache: { type: Schema.Types.Mixed, default: undefined },

    companyId: { type: String, required: [true, "companyId is required"], index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// LHC numbers are unique per company, not globally.
lorryHireSchema.index({ companyId: 1, lhcNo: 1 }, { unique: true });
lorryHireSchema.index({ companyId: 1, createdAt: -1 });
lorryHireSchema.index({ companyId: 1, status: 1, createdAt: -1 });
lorryHireSchema.index({ companyId: 1, "supplier.supplierId": 1, lhcDate: -1 });
lorryHireSchema.index({ companyId: 1, "truck.vehicleNumber": 1, lhcDate: -1 });
lorryHireSchema.index({ companyId: 1, "items.consignmentId": 1 });
lorryHireSchema.index({ companyId: 1, "settlement.paymentStatus": 1 });

dropStaleModel("LorryHire", "settlement");

const LorryHireModel: Model<ILorryHire> =
  (mongoose?.models?.LorryHire as Model<ILorryHire>) || model<ILorryHire>("LorryHire", lorryHireSchema);

export default LorryHireModel;
