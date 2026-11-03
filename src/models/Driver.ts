import mongoose, { model, Schema, type Document, type Model } from "mongoose";
import { dropStaleModel } from "@/lib/model-guard";

export interface IDriver extends Document {
  companyId: string;
  name: string;
  mobile: string;
  licenseNumber: string;
  licenseClass: string;
  licenseExpiry?: Date;
  address: string;
  status: "Active" | "Inactive";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    companyId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    mobile: { type: String, default: "", trim: true, maxlength: 30 },
    licenseNumber: { type: String, default: "", trim: true, uppercase: true, maxlength: 60 },
    licenseClass: { type: String, default: "", trim: true, uppercase: true, maxlength: 40 },
    licenseExpiry: Date,
    address: { type: String, default: "", trim: true, maxlength: 500 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", required: true },
    notes: { type: String, default: "", trim: true, maxlength: 5000 },
  },
  { timestamps: true }
);

driverSchema.index({ companyId: 1, mobile: 1 });
driverSchema.index({ companyId: 1, status: 1 });

dropStaleModel("Driver", "licenseClass");

const DriverModel: Model<IDriver> =
  (mongoose.models.Driver as Model<IDriver>) || model<IDriver>("Driver", driverSchema);

export default DriverModel;
