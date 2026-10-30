import mongoose, { model, Schema, Document, Model } from "mongoose";
import { dropStaleModel } from "@/lib/model-guard";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/ledger/payment-modes";

export const PAYMENT_PARTY_TYPES = ["customer", "supplier"] as const;
export type PaymentPartyType = (typeof PAYMENT_PARTY_TYPES)[number];

/**
 * "received"              customer paid us (credit) / reserved for suppliers: "paid"
 * "receivable_adjustment" manual "Receivable (Debit)" entry.
 *
 * Why not a separate LedgerAdjustment model: both are dated, party-scoped money
 * movements with the same fields (amount, mode, reference, remark) and the same
 * indexes. One collection keeps ledger loading to a single query and lets
 * suppliers reuse it later with direction "paid".
 */
export const PAYMENT_DIRECTIONS = ["received", "paid", "receivable_adjustment"] as const;
export type PaymentDirection = (typeof PAYMENT_DIRECTIONS)[number];

export { PAYMENT_MODES, type PaymentMode };

export interface IPayment extends Document {
  companyId: string;
  partyType: PaymentPartyType;
  partyId: mongoose.Types.ObjectId;
  partyName: string;
  direction: PaymentDirection;
  billId?: mongoose.Types.ObjectId;
  billNo?: string;
  consignmentId?: mongoose.Types.ObjectId;
  /** Set on supplier payments that mirror a lorry hire contract's payment. */
  lorryHireId?: mongoose.Types.ObjectId;
  lhcNo?: string;
  amount: number;
  date: Date;
  mode: PaymentMode;
  /** UTR / cheque number. */
  reference: string;
  remark: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    companyId: { type: String, required: [true, "companyId is required"], index: true },
    partyType: { type: String, enum: PAYMENT_PARTY_TYPES, required: true, default: "customer" },
    partyId: { type: Schema.Types.ObjectId, required: true },
    partyName: { type: String, required: true, trim: true },
    direction: { type: String, enum: PAYMENT_DIRECTIONS, required: true, default: "received" },
    billId: { type: Schema.Types.ObjectId, ref: "FreightBill" },
    billNo: { type: String, trim: true },
    consignmentId: { type: Schema.Types.ObjectId, ref: "Consignment" },
    lorryHireId: { type: Schema.Types.ObjectId, ref: "LorryHire" },
    lhcNo: { type: String, trim: true },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than 0"],
      set: (v: number) => Math.round(v * 100) / 100,
    },
    date: { type: Date, required: true },
    mode: { type: String, enum: PAYMENT_MODES, default: "Cash" },
    reference: { type: String, default: "", trim: true, maxlength: 100 },
    remark: { type: String, default: "", trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

paymentSchema.index({ companyId: 1, partyId: 1, date: -1 });
paymentSchema.index({ companyId: 1, billId: 1 });
paymentSchema.index({ companyId: 1, lorryHireId: 1 });

dropStaleModel("Payment", "lorryHireId");

const PaymentModel: Model<IPayment> =
  (mongoose?.models?.Payment as Model<IPayment>) || model<IPayment>("Payment", paymentSchema);

export default PaymentModel;
