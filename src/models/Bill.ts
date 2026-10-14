import mongoose, { model, Schema, Document, Model } from "mongoose";
import { BILLING_PARTIES } from "@/lib/validations/billing";
import type { ChargeLine } from "@/lib/charges";

// ─── Sub-document interfaces ────────────────────────────────────────────────

export interface IBillParty {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  mobile?: string;
}

export interface IBillItem {
  consignmentId: mongoose.Types.ObjectId;
  srNo: number;
  cnsNo: string;
  bookingStn?: string;
  toStn?: string;
  date?: string;
  freightAmt: number;
  lrCharges: number;
  detentionCharges: number;
  unloadingCharges: number;
  loadingCharges: number;
  gstinCharges: number;
  chargeLines?: ChargeLine[];
  totalCharges: number;
}

export interface IFreightBill extends Document {
  billStn: string;
  billNo: string;
  billDate: Date | string;

  billedToType: (typeof BILLING_PARTIES)[number];
  billedTo: IBillParty;

  items: IBillItem[];
  totalAmount: number;

  remark?: string;
  vehicleNumber?: string;

  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const billPartySchema = new Schema<IBillParty>(
  {
    name: { type: String, required: [true, "Billed-to name is required"], trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    gstin: { type: String, default: "" },
    mobile: { type: String, default: "" },
  },
  { _id: false }
);

const billItemSchema = new Schema<IBillItem>(
  {
    consignmentId: { type: Schema.Types.ObjectId, ref: "Consignment", required: true },
    srNo: { type: Number, required: true, min: 1 },
    cnsNo: { type: String, required: true, trim: true },
    bookingStn: { type: String, default: "" },
    toStn: { type: String, default: "" },
    date: { type: String, default: "" },
    freightAmt: { type: Number, default: 0, min: 0 },
    lrCharges: { type: Number, default: 0, min: 0 },
    detentionCharges: { type: Number, default: 0, min: 0 },
    unloadingCharges: { type: Number, default: 0, min: 0 },
    loadingCharges: { type: Number, default: 0, min: 0 },
    gstinCharges: { type: Number, default: 0, min: 0 },
    chargeLines: {
      type: [
        new Schema<ChargeLine>(
          {
            chargeId: { type: String, required: true, maxlength: 48 },
            name: { type: String, required: true, trim: true, maxlength: 60 },
            amount: { type: Number, required: true, min: 0, max: 1000000000 },
          },
          { _id: false }
        ),
      ],
      default: undefined,
    },
    totalCharges: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ─── Main schema ─────────────────────────────────────────────────────────────

const freightBillSchema = new Schema<IFreightBill>(
  {
    billStn: { type: String, required: [true, "Bill STN is required"], trim: true },
    billNo: {
      type: String,
      required: [true, "Bill number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    billDate: { type: Date, required: true },

    billedToType: { type: String, enum: BILLING_PARTIES, required: true },
    billedTo: { type: billPartySchema, required: true },

    items: {
      type: [billItemSchema],
      validate: {
        validator: (v: IBillItem[]) => Array.isArray(v) && v.length > 0,
        message: "A bill needs at least one consignment.",
      },
    },
    totalAmount: { type: Number, default: 0, min: 0 },

    remark: { type: String, default: "" },
    vehicleNumber: { type: String, default: "" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

freightBillSchema.index({ createdAt: -1 });
freightBillSchema.index({ "items.consignmentId": 1 });
freightBillSchema.index({ "billedTo.name": 1 });

const FreightBillModel: Model<IFreightBill> =
  (mongoose?.models?.FreightBill as Model<IFreightBill>) || model<IFreightBill>("FreightBill", freightBillSchema);

export default FreightBillModel;