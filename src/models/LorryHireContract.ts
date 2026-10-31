import mongoose, { model, Schema, Document, Model } from "mongoose";
import { dropStaleModel } from "@/lib/model-guard";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/ledger/payment-modes";

/**
 * A lorry hire contract: what we agreed to pay a supplier (transporter / vehicle
 * owner) for a trip. `totalPayable` is the supplier-ledger PAYABLE amount. The
 * server computes it (see contractTotalPayable) and never trusts a client value.
 * Paying it down is done with Payment documents (partyType "supplier").
 */
export interface ILorryHireContract extends Document {
  companyId: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  contractNo: string;
  date: Date;
  vehicleNo: string;
  /** LR / bilty numbers on the trip (free text; not linked to Consignment documents). */
  consignmentNos: string[];
  hireAmount: number;
  otherCharges: number;
  deductions: number;
  /** TDS withheld from the supplier. Reduces the payable; not a cash payment. */
  tdsAmount: number;
  totalPayable: number;
  advancePaid: number;
  advanceDate?: string;
  advanceVia?: PaymentMode;
  remark: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const money = {
  type: Number,
  default: 0,
  min: 0,
  set: (v: number) => Math.round(v * 100) / 100,
};

const schema = new Schema<ILorryHireContract>(
  {
    companyId: { type: String, required: [true, "companyId is required"], index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, required: true, trim: true },
    contractNo: { type: String, required: [true, "Contract number is required"], trim: true, maxlength: 50 },
    date: { type: Date, required: true },
    vehicleNo: { type: String, default: "", trim: true, uppercase: true, maxlength: 20 },
    consignmentNos: { type: [String], default: [] },
    hireAmount: { ...money, required: true },
    otherCharges: money,
    deductions: money,
    tdsAmount: money,
    totalPayable: { type: Number, required: true, min: [0.01, "Total payable must be greater than 0"] },
    advancePaid: money,
    advanceDate: { type: String },
    advanceVia: { type: String, enum: PAYMENT_MODES },
    remark: { type: String, default: "", trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Ledger load: all contracts of one supplier, newest first.
schema.index({ companyId: 1, supplierId: 1, date: -1 });
// A contract number is unique inside a company.
schema.index({ companyId: 1, contractNo: 1 }, { unique: true });

dropStaleModel("LorryHireContract", "tdsAmount");

const LorryHireContractModel: Model<ILorryHireContract> =
  (mongoose?.models?.LorryHireContract as Model<ILorryHireContract>) ||
  model<ILorryHireContract>("LorryHireContract", schema);

export default LorryHireContractModel;
