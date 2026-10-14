import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import { DEFAULT_APPEARANCE_THEME, validateAppearanceTheme } from "@/lib/appearance-theme";
import UserModel from "@/models/User";

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { _id?: unknown; role?: unknown; isApproved?: unknown }
    | undefined;
  if (
    user?.role !== "transporter" ||
    user.isApproved !== true ||
    typeof user._id !== "string" ||
    !user._id
  ) return null;
  return user._id;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await UserModel.findById(userId).select("appearanceTheme").lean();
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const savedTheme = validateAppearanceTheme(user.appearanceTheme);
    return NextResponse.json({ success: true, data: savedTheme ?? DEFAULT_APPEARANCE_THEME });
  } catch (error) {
    console.error("Unable to load appearance settings:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load appearance settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const theme = validateAppearanceTheme(body);
    if (!theme) {
      return NextResponse.json(
        {
          success: false,
          message: "Choose valid colors with readable text contrast (at least 4.5:1).",
        },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { appearanceTheme: theme } },
      { new: true, runValidators: true, projection: { appearanceTheme: 1 } }
    ).lean();
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Appearance saved", data: theme });
  } catch (error) {
    console.error("Unable to save appearance settings:", error);
    return NextResponse.json(
      { success: false, message: "Unable to save appearance settings" },
      { status: 500 }
    );
  }
}
