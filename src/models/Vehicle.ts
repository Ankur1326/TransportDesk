import mongoose, { model, Schema, type Model } from "mongoose";
import { dropStaleModel } from "@/lib/model-guard";
import { normalizeVehicleNumber, WEIGHT_UNITS, type WeightUnit } from "@/lib/lorry-hire/constants";
import { VEHICLE_DOCUMENT_KEYS, type FleetDocument, type OtherFleetDocument } from "@/lib/fleet-types";

export interface IVehicle {
  companyId: string;
  registrationNumber: string;
  ownership: "Own" | "Market";
  ownerSupplierId?: mongoose.Types.ObjectId;
  truckType: string;
  capacity: number;
  capacityUnit: WeightUnit;
  make: string;
  model: string;
  year?: number;
  chassisNo: string;
  engineNo: string;
  status: "Active" | "Inactive";
  defaultDriverId?: mongoose.Types.ObjectId;
  notes: string;
  documents: Record<(typeof VEHICLE_DOCUMENT_KEYS)[number], FleetDocument>;
  otherDocuments: OtherFleetDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<FleetDocument>(
  {
    number: { type: String, default: "", trim: true, maxlength: 120 },
    issuedOn: Date,
    expiresOn: Date,
    fileUrl: { type: String, default: "", maxlength: 2048 },
    filePublicId: { type: String, default: "", maxlength: 255 },
  },
  { _id: false }
);

const vehicleSchema = new Schema<IVehicle>(
  {
    companyId: { type: String, required: true, index: true },
    registrationNumber: { type: String, required: true, trim: true, uppercase: true, set: normalizeVehicleNumber, maxlength: 20 },
    ownership: { type: String, enum: ["Own", "Market"], default: "Market", required: true },
    ownerSupplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    truckType: { type: String, default: "", trim: true, maxlength: 80 },
    capacity: { type: Number, default: 0, min: 0, max: 100000 },
    capacityUnit: { type: String, enum: WEIGHT_UNITS, default: "MTS" },
    make: { type: String, default: "", trim: true, maxlength: 80 },
    model: { type: String, default: "", trim: true, maxlength: 80 },
    year: { type: Number, min: 1900, max: 2200 },
    chassisNo: { type: String, default: "", trim: true, uppercase: true, maxlength: 80 },
    engineNo: { type: String, default: "", trim: true, uppercase: true, maxlength: 80 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", required: true },
    defaultDriverId: { type: Schema.Types.ObjectId, ref: "Driver" },
    notes: { type: String, default: "", trim: true, maxlength: 5000 },
    documents: {
      type: new Schema(
        Object.fromEntries(VEHICLE_DOCUMENT_KEYS.map((key) => [key, { type: documentSchema, default: () => ({}) }])),
        { _id: false }
      ),
      default: () => ({}),
    },
    otherDocuments: {
      type: [new Schema<OtherFleetDocument>(
        {
          name: { type: String, required: true, trim: true, maxlength: 100 },
          number: { type: String, default: "", trim: true, maxlength: 120 },
          issuedOn: Date,
          expiresOn: Date,
          fileUrl: { type: String, default: "", maxlength: 2048 },
          filePublicId: { type: String, default: "", maxlength: 255 },
        },
        { timestamps: false }
      )],
      default: [],
      validate: (value: OtherFleetDocument[]) => value.length <= 30,
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ companyId: 1, registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ companyId: 1, status: 1 });

dropStaleModel("Vehicle", "documents");

const VehicleModel: Model<IVehicle> =
  (mongoose.models.Vehicle as Model<IVehicle>) || model<IVehicle>("Vehicle", vehicleSchema);

export default VehicleModel;
