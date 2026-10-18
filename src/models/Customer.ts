import mongoose, { model, Schema, Document, Model } from "mongoose";

// Define the Category interface, extending Mongoose's Document
export interface ICustomer extends Document {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstin: string;
    mobile: string | null;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerSchema: Schema<ICustomer> = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            unique: true,
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
    },
    {
        timestamps: true,     // Adds createdAt and updatedAt timestamps
    }
)

const Customer: Model<ICustomer> = (mongoose?.models?.Customer as Model<ICustomer>) || model<ICustomer>("Customer", CustomerSchema)

export default Customer;