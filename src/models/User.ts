import mongoose, { model, Schema, Document } from "mongoose";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { AppearanceTheme } from "@/lib/appearance-theme";

enum UserRole {
    transporter = 'transporter',
}

interface IUser extends Document {
    // username: string;
    password: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    // verifyCode: string;
    // verifyCodeExpiry: Date;
    // resetPasswordToken?: string;
    // resetPasswordExpires?: Date;
    isApproved: boolean;
    fullName?: string; // Full name of the user
    mobileNum?: string; // Mobile number of the user
    address?: string; // Address of the user
    profilePicture?: string; // URL or path to the profile picture
    dateOfBirth?: Date; // Date of birth
    gender?: string; // Gender
    appearanceTheme?: AppearanceTheme;
    comparePassword(password: string): Promise<boolean>;
    generateAccessToken(): string;
    generateRefreshToken(): string;
}

const userSchema = new Schema<IUser>({
    // username: {
    //     type: String,
    //     required: [true, "Username is required"],
    //     unique: true,
    //     index: true,
    // },
    password: {
        type: String,
        required: [true, "Password is reqiured"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    role: {
        type: String,
        enum: Object.values(UserRole),
        required: [true, "Role is required"],
    },
    // verifyCode: {
    //     type: String,
    //     required: [true, "verify code is required"],
    // },
    // verifyCodeExpiry: {
    //     type: Date,
    //     required: [true, "verify code expiry is required"],
    // },
    // resetPasswordToken: {
    //     type: String,
    //     default: undefined,
    // },
    // resetPasswordExpires: {
    //     type: Date,
    //     default: undefined,
    // },
    isVerified: { // this field is toggle by admins
        type: Boolean,
        default: false,
    },
    isApproved: { // this field is toggle by admins
        type: Boolean,
        default: false,
    },
    fullName: {
        type: String,
        default: '',
    },
    mobileNum: {
        type: String,
        default: '',
    },
    address: {
        type: String,
        default: '',
    },
    profilePicture: {
        type: String,
        default: '',
    },
    dateOfBirth: {
        type: Date,
        default: undefined,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', ''],
        default: '',
    },
    appearanceTheme: {
        type: Schema.Types.Mixed,
        default: undefined,
    },
}, { timestamps: true });

// Hash password before saving the user
userSchema.pre<IUser>('save', async function (next: any) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next();
});

userSchema.methods.generateAccessToken = function (): string {
    const accessTokenSecret: any = process.env.ACCESS_TOKEN_SECRET || '';
    const accessTokenExpiry: any = process.env.ACCESS_TOKEN_EXPIRY || '1d';

    if (!accessTokenSecret) {
        throw new Error("ACCESS_TOKEN_SECRET is not defined in environment variables");
    }

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            // username: this.username,
        },
        accessTokenSecret,
        {
            expiresIn: accessTokenExpiry || '1d'
        }
    );
}

userSchema.methods.generateRefreshToken = function (): string {
    const refreshTokenSecret: any = process.env.REFRESH_TOKEN_SECRET || '';
    const refreshTokenExpiry: any = process.env.REFRESH_TOKEN_EXPIRY || '7d';

    if (!refreshTokenSecret) {
        throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
    }

    return jwt.sign(
        {
            _id: this._id,
        },
        refreshTokenSecret,
        {
            expiresIn: refreshTokenExpiry || '7d'
        }
    );
}

// Method to compare passwords
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
};

const UserModel = (mongoose?.models?.User as mongoose.Model<IUser>) || model<IUser>('User', userSchema)
export default UserModel