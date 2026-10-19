import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";

const GENDERS = new Set(["male", "female", "other", ""]);

/**
 * Updates the *signed-in* user's profile. The target is taken from the
 * session, never from the request body (the old version trusted a `userId`
 * from the client, so anyone could edit anyone's profile), and only a
 * whitelist of fields can be changed.
 */
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { _id?: string } | undefined)?._id;

    if (!userId) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { formData } = await request.json();
        const data = formData && typeof formData === "object" ? formData : {};

        await dbConnect();
        const user = await UserModel.findById(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        if (typeof data.fullName === "string" && data.fullName.trim()) user.fullName = data.fullName.trim().slice(0, 80);
        if (typeof data.mobileNum === "string" && data.mobileNum.trim()) user.mobileNum = data.mobileNum.trim().slice(0, 20);
        if (typeof data.address === "string" && data.address.trim()) user.address = data.address.trim().slice(0, 300);
        if (typeof data.gender === "string" && GENDERS.has(data.gender)) user.gender = data.gender;
        if (data.dateOfBirth) {
            const dob = new Date(data.dateOfBirth);
            if (!Number.isNaN(dob.getTime())) user.dateOfBirth = dob;
        }

        await user.save();

        const safeUser = user.toObject();
        delete (safeUser as { password?: string }).password;
        return NextResponse.json({ success: true, message: "Profile updated successfully", user: safeUser });
    } catch (error) {
        console.error("Error while updating user profile:", error);
        return NextResponse.json({ success: false, message: "Internal server error while updating user profile" }, { status: 500 });
    }
}
