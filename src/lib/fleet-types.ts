import type { WeightUnit } from "@/lib/lorry-hire/constants";

export const VEHICLE_DOCUMENT_KEYS = [
  "insurance",
  "fitness",
  "permit",
  "puc",
  "roadTax",
  "nationalPermit",
] as const;
export type VehicleDocumentKey = (typeof VEHICLE_DOCUMENT_KEYS)[number];

export interface FleetDocument {
  number: string;
  issuedOn?: string;
  expiresOn?: string;
  fileUrl: string;
  filePublicId: string;
}

export interface OtherFleetDocument extends FleetDocument {
  _id?: string;
  name: string;
}

export interface VehicleMaster {
  _id: string;
  registrationNumber: string;
  ownership: "Own" | "Market";
  ownerSupplierId?: string;
  truckType: string;
  capacity: number;
  capacityUnit: WeightUnit;
  make: string;
  model: string;
  year?: number;
  chassisNo: string;
  engineNo: string;
  status: "Active" | "Inactive";
  defaultDriverId?: string;
  notes: string;
  documents: Record<VehicleDocumentKey, FleetDocument>;
  otherDocuments: OtherFleetDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface DriverMaster {
  _id: string;
  name: string;
  mobile: string;
  licenseNumber: string;
  licenseClass: string;
  licenseExpiry?: string;
  address: string;
  status: "Active" | "Inactive";
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FleetExpiringDocument {
  entityType: "Vehicle" | "Driver";
  entityId: string;
  entityName: string;
  documentName: string;
  expiresOn: string;
  status: "Expiring" | "Expired";
}
