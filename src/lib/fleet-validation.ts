import { z } from "zod";
import { normalizeVehicleNumber, WEIGHT_UNITS } from "@/lib/lorry-hire/constants";
import { VEHICLE_DOCUMENT_KEYS } from "@/lib/fleet-types";

const optionalDate = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => {
    if (value === undefined) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid date");

const documentSchema = z.object({
  number: z.string().trim().max(120).default(""),
  issuedOn: optionalDate,
  expiresOn: optionalDate,
  fileUrl: z.string().max(2048).refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
    } catch {
      return false;
    }
  }, "Document URL must point to Cloudinary").default(""),
  filePublicId: z.string().max(255).regex(/^[\w/-]*$/).default(""),
});
const optionalObjectId = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().regex(/^[a-f\d]{24}$/i).optional()
);

export const otherDocumentSchema = documentSchema.extend({
  _id: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  name: z.string().trim().min(1).max(100),
});

const vehicleFields = {
  registrationNumber: z.string().trim().min(1).max(40).transform(normalizeVehicleNumber).pipe(z.string().min(1).max(20)),
  ownership: z.enum(["Own", "Market"]).default("Market"),
  ownerSupplierId: optionalObjectId,
  truckType: z.string().trim().max(80).default(""),
  capacity: z.coerce.number().finite().min(0).max(100000).default(0),
  capacityUnit: z.enum(WEIGHT_UNITS).default("MTS"),
  make: z.string().trim().max(80).default(""),
  model: z.string().trim().max(80).default(""),
  year: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(1900).max(2200).optional()
  ),
  chassisNo: z.string().trim().max(80).transform((value) => value.toUpperCase()).default(""),
  engineNo: z.string().trim().max(80).transform((value) => value.toUpperCase()).default(""),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  defaultDriverId: optionalObjectId,
  notes: z.string().trim().max(5000).default(""),
  documents: z.object(
    Object.fromEntries(VEHICLE_DOCUMENT_KEYS.map((key) => [key, documentSchema.optional()])) as Record<
      (typeof VEHICLE_DOCUMENT_KEYS)[number],
      z.ZodOptional<typeof documentSchema>
    >
  ).default({}),
  otherDocuments: z.array(otherDocumentSchema).max(30).default([]),
};

export const vehicleSchema = z.object(vehicleFields);
export const vehicleUpdateSchema = z.object(vehicleFields).partial();

export const driverSchema = z.object({
  name: z.string().trim().min(2).max(120),
  mobile: z.string().trim().max(30).default(""),
  licenseNumber: z.string().trim().max(60).transform((value) => value.toUpperCase()).default(""),
  licenseClass: z.string().trim().max(40).transform((value) => value.toUpperCase()).default(""),
  licenseExpiry: optionalDate,
  address: z.string().trim().max(500).default(""),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  notes: z.string().trim().max(5000).default(""),
});

export const driverUpdateSchema = driverSchema.partial();
