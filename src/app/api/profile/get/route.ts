import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";

/**
 * Returns the *signed-in* user's profile. The previous version looked users
 * up by an `?email=` query param with no authentication and returned the whole
 * document (including the password hash) — any visitor could read any account.
 */
export async function GET() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { _id?: string } | undefined)?._id;

    if (!userId) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        await dbConnect();
        const user = await UserModel.findById(userId).select("-password -__v").lean();

        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "User successfully fetched", user });
    } catch (error) {
        console.error("Error while fetching user profile:", error);
        return NextResponse.json({ success: false, message: "Error fetching user profile" }, { status: 500 });
    }
}
