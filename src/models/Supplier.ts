import mongoose, { model, Schema, Document, Model } from "mongoose";
import { dropStaleModel } from "@/lib/model-guard";
import { BALANCE_TYPES, type BalanceType } from "@/lib/opening-balance";

// Define the Supplier interface, extending Mongoose's Document
export interface ISupplier extends Document {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstin: string;
    mobile: string | null;
    email: string;
    /** Balance when the supplier was added. See src/lib/opening-balance.ts. */
    openingBalance: number;
    /** "debit" = Paid, "credit" = Payable. */
    balanceType: BalanceType;
    companyId: string;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SupplierSchema: Schema<ISupplier> = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,         // Trims whitespace
            minlength: 2,
            maxlength: 100
        },
        address: {
            type: String,
            default: ""
        },
        city: {
            type: String,
            default: ""
        },
        state: {
            type: String,
            default: ""
        },
        pincode: {
            type: String,
            default: ""
        },
        gstin: {
            type: String,
            default: ""
        },
        mobile: {
            type: String,
            default: null
        },
        email: {
            type: String,
            default: ""
        },
        openingBalance: {
            type: Number,
            default: 0,
            min: 0
        },
        balanceType: {
            type: String,
            enum: BALANCE_TYPES,
            default: "debit"
        },
        companyId: {
            type: String,
            required: [true, "companyId is required"],
            index: true,
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    {
        timestamps: true,     // Adds createdAt and updatedAt timestamps
    }
)

// Names are unique per company, not globally.
SupplierSchema.index({ companyId: 1, name: 1 }, { unique: true })

dropStaleModel("Supplier", "balanceType");

const Supplier: Model<ISupplier> = (mongoose?.models?.Supplier as Model<ISupplier>) || model<ISupplier>("Supplier", SupplierSchema)

export default Supplier;