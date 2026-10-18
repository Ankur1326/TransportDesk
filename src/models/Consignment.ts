import mongoose, { model, Schema, Document, Model } from "mongoose";
import {
    PACKING_TYPES,
    // VOLUME_UNITS,
    // WEIGHT_UNITS,
    SEGMENTS,
    LOAD_TYPES,
    GST_TYPES,
    PAYMENT_TYPES,
    BILLING_PARTIES,
    PAYMENT_STATUSES,
    RECEIVED_TYPES,
} from "@/lib/validations/billing";
import type { ChargeLine } from "@/lib/charges";
import { LR_STATUSES, type LrStatus } from "@/lib/consignment-status";

// ─── Sub-document interfaces ────────────────────────────────────────────────

export interface IParty {
    customerId?: string;
    name: string;
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    mobile: string;
    email?: string;
}

export interface ILocation {
    location: string;
    branch?: string;
    state?: string;
    gstin?: string;
}

export interface IShipment {
    packages: string;
    packing: (typeof PACKING_TYPES)[number];
    description: string;
    classification?: string;
    declaredValue?: string;
    invoiceNumber?: string;
    volume?: string;
    // volumeUnit: (typeof VOLUME_UNITS)[number];
    actualWeight: string;
    chargeWeight: string;
}

export interface IVehicleDetails {
    driverName?: string;
    driverMobile?: string;
    transportMode?: string;
    branch?: string;
    deliveryBranch?: string;
    route?: string;
    expectedDeliveryDate?: Date | string;
}

export interface ICharges {
    freight: number;
    localGodownCharges: number;
    unloadingCharge: number;
    loadingCharge: number;
    codCharges: number;
    statisticalCharges: number;
    localCollectionCharges: number;
    chargeLines?: ChargeLine[];
}

export interface ITax {
    type: (typeof GST_TYPES)[number];
    percentage: 0 | 5 | 12 | 18 | "custom";
    customPercentage?: number;
}

export interface IPayment {
    type: (typeof PAYMENT_TYPES)[number];
    billingParty: (typeof BILLING_PARTIES)[number];
    billingAccount?: string;
    status: (typeof PAYMENT_STATUSES)[number];
    receivedMoney: string;
    receivedDate: string;
    UTRNumber: string;
    receivedType: (typeof RECEIVED_TYPES)[number];
    mrNumber: string;
    mrDate: string;
}

export interface IInsurance {
    required: boolean;
    company?: string;
    policyNumber?: string;
    amount?: number;
    date?: Date | string;
    riskType?: string;
}

export interface IStatusHistory {
    status: LrStatus;
    at: Date;
    by?: string;
    note?: string;
}

export interface IConsignment extends Document {
    consignmentNumber: string;
    bookingDate: Date | string;
    cnsDate?: Date | string;
    eWayBillNumber?: string;
    validUpTo?: Date | string;
    invoiceNumber?: string;
    invoiceDate?: Date | string;
    vehicleNumber: string;

    from: ILocation;
    to: ILocation;

    consignor: IParty;
    consignee: IParty;

    shipment: IShipment;

    segment: (typeof SEGMENTS)[number];
    loadType: (typeof LOAD_TYPES)[number];

    vehicle: IVehicleDetails;
    charges: ICharges;
    tax: ITax;
    payment: IPayment;
    insurance: IInsurance;

    remarks?: string;
    internalNotes?: string;
    specialInstructions?: string;

    // Lifecycle
    status: LrStatus;
    statusHistory?: IStatusHistory[];
    deliveredAt?: Date;
    cancelledAt?: Date;
    cancelReason?: string;

    // Proof of delivery
    podUrl?: string;
    podPublicId?: string;
    podResourceType?: string;
    podFileName?: string;
    podUploadedAt?: Date;

    companyId?: string;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const partySchema = new Schema<IParty>(
    {
        customerId: { type: String, default: "" },
        name: { type: String, trim: true },
        address: { type: String, trim: true },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        pincode: { type: String, default: "" },
        gstin: { type: String, default: "" },
        mobile: { type: String, trim: true },
        email: { type: String, default: "" },
    },
    { _id: false }
);

const locationSchema = new Schema<ILocation>(
    {
        location: { type: String, trim: true },
        branch: { type: String, default: "" },
        state: { type: String, default: "" },
        gstin: { type: String, default: "" },
    },
    { _id: false }
);

const shipmentSchema = new Schema<IShipment>(
    {
        packages: { type: String },
        packing: { type: String, enum: PACKING_TYPES },
        description: { type: String, trim: true },
        classification: { type: String, default: "" },
        declaredValue: { type: String, default: "" },
        invoiceNumber: { type: String, default: "" },
        volume: { type: String, default: "" },
        // volumeUnit: { type: String, enum: VOLUME_UNITS},
        actualWeight: { type: String, default: "" },
        chargeWeight: { type: String, default: "" }
    },
    { _id: false }
);

const vehicleDetailsSchema = new Schema<IVehicleDetails>(
    {
        driverName: { type: String, default: "" },
        driverMobile: { type: String, default: "" },
        transportMode: { type: String, default: "" },
        branch: { type: String, default: "" },
        deliveryBranch: { type: String, default: "" },
        route: { type: String, default: "" },
        expectedDeliveryDate: { type: Date },
    },
    { _id: false }
);

const chargesSchema = new Schema<ICharges>(
    {
        freight: { type: Number, default: 0, min: 0 },
        localGodownCharges: { type: Number, default: 0, min: 0 },
        unloadingCharge: { type: Number, default: 0, min: 0 },
        loadingCharge: { type: Number, default: 0, min: 0 },
        codCharges: { type: Number, default: 0, min: 0 },
        statisticalCharges: { type: Number, default: 0, min: 0 },
        localCollectionCharges: { type: Number, default: 0, min: 0 },
        chargeLines: {
            type: [new Schema<ChargeLine>(
                {
                    chargeId: { type: String, required: true, maxlength: 48 },
                    name: { type: String, required: true, trim: true, maxlength: 60 },
                    amount: { type: Number, required: true, min: 0, max: 1000000000 },
                },
                { _id: false }
            )],
            default: undefined,
        },
    },
    { _id: false }
);

const taxSchema = new Schema<ITax>(
    {
        type: { type: String, enum: GST_TYPES },
        percentage: { type: Schema.Types.Mixed },
        customPercentage: { type: Number, min: 0, max: 100 },
    },
    { _id: false }
);

const paymentSchema = new Schema<IPayment>(
    {
        type: { type: String, enum: PAYMENT_TYPES, },
        billingParty: { type: String, enum: BILLING_PARTIES },
        billingAccount: { type: String, default: "" },
        status: { type: String, enum: PAYMENT_STATUSES, default: "Pending" },
        receivedType: { type: String, enum: RECEIVED_TYPES, default: "" },
        receivedMoney: { type: String, default: "" },
        receivedDate: { type: String, default: "" },
        UTRNumber: { type: String, default: "" },
        mrNumber: { type: String, default: "" },
        mrDate: { type: String, default: "" },
    },
    { _id: false }
);

const insuranceSchema = new Schema<IInsurance>(
    {
        required: { type: Boolean, default: false },
        company: { type: String, default: "" },
        policyNumber: { type: String, default: "" },
        amount: { type: Number, default: 0, min: 0 },
        date: { type: Date },
        riskType: { type: String, default: "" },
    },
    { _id: false }
);

const statusHistorySchema = new Schema<IStatusHistory>(
    {
        status: { type: String, enum: LR_STATUSES, required: true },
        at: { type: Date, default: Date.now },
        by: { type: String, default: "" },
        note: { type: String, default: "", maxlength: 200 },
    },
    { _id: false }
);

// ─── Main schema ─────────────────────────────────────────────────────────────

const consignmentSchema = new Schema<IConsignment>(
    {
        consignmentNumber: {
            type: String,
            required: [true, "Consignment number is required"],
            trim: true,
            index: true,
        },
        bookingDate: { type: Date },
        cnsDate: { type: Date },
        eWayBillNumber: { type: String, default: "" },
        validUpTo: { type: Date },
        invoiceNumber: { type: String, default: "" },
        invoiceDate: { type: Date },
        vehicleNumber: { type: String, trim: true, index: true },

        from: { type: locationSchema },
        to: { type: locationSchema },

        consignor: { type: partySchema },
        consignee: { type: partySchema },

        shipment: { type: shipmentSchema },

        segment: { type: String, enum: SEGMENTS },
        loadType: { type: String, enum: LOAD_TYPES },

        vehicle: { type: vehicleDetailsSchema, default: () => ({}) },
        charges: { type: chargesSchema, default: () => ({}) },
        tax: { type: taxSchema },
        payment: { type: paymentSchema },
        insurance: { type: insuranceSchema, default: () => ({}) },

        remarks: { type: String, default: "" },
        internalNotes: { type: String, default: "" },
        specialInstructions: { type: String, default: "" },

        status: { type: String, enum: LR_STATUSES, default: "Booked", index: true },
        statusHistory: { type: [statusHistorySchema], default: undefined },
        deliveredAt: { type: Date },
        cancelledAt: { type: Date },
        cancelReason: { type: String, default: "", maxlength: 200 },

        podUrl: { type: String, default: "" },
        podPublicId: { type: String, default: "" },
        podResourceType: { type: String, default: "" },
        podFileName: { type: String, default: "" },
        podUploadedAt: { type: Date },

        companyId: { type: String, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

// Numbers are unique per company. (The legacy global `consignmentNumber_1`
// unique index is dropped by scripts/migrate-consignments.mjs.)
consignmentSchema.index({ companyId: 1, consignmentNumber: 1 }, { unique: true });
consignmentSchema.index({ companyId: 1, status: 1, bookingDate: -1 });
consignmentSchema.index({ "payment.status": 1 });
consignmentSchema.index({ bookingDate: -1 });
consignmentSchema.index({ "consignor.name": 1 });
consignmentSchema.index({ "consignee.name": 1 });
consignmentSchema.index({ createdAt: -1 });

const ConsignmentModel: Model<IConsignment> =
    (mongoose?.models?.Consignment as Model<IConsignment>) ||
    model<IConsignment>("Consignment", consignmentSchema);

export default ConsignmentModel;