import mongoose, { model, Schema, type Document, type Model } from "mongoose";

/**
 * A tenant. Every customer, bill and consignment (bilty) belongs to exactly
 * one company via `companyId` (the string form of this document's `_id`).
 * `ownerUserId` is the user who created the company; more users can be added
 * to the same company later by setting their `User.companyId`.
 */
export interface ICompany extends Document {
  name: string;
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, default: "", trim: true, maxlength: 160 },
    ownerUserId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

const CompanyModel: Model<ICompany> =
  (mongoose?.models?.Company as Model<ICompany>) || model<ICompany>("Company", companySchema);

export default CompanyModel;
