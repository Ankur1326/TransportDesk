import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import { ensureUserCompany } from "@/lib/company-provision";
import {
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth-config";

function fail(message: string, status: number, field?: string) {
  return Response.json({ success: false, message, field }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body", 400);
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 80) : "";
  if (!isValidEmail(email)) return fail("Enter a valid email address", 400, "email");
  if (!isStrongPassword(password)) {
    return fail("Password must be 8+ characters with upper and lower case letters and a number", 400, "password");
  }

  try {
    await dbConnect();

    const existing = await UserModel.findOne({ email }).select("_id").lean();
    console.log("existing: ", existing)
    if (existing) {
      console.log("An account with this email already exists. Try signing in instead")
      return fail("An account with this email already exists. Try signing in instead.", 409, "email");
    }

    const user = await UserModel.create({
      email,
      password, // hashed by the model's pre-save hook
      fullName,
      role: "transporter",
      isVerified: true,
      isApproved: true, // self-serve SaaS: new accounts can sign in immediately
    });

    // Each new sign-up gets its own company; all of its data is scoped by it.
    await ensureUserCompany(user._id.toString(), { fresh: true, companyName: fullName });

    return Response.json(
      {
        success: true,
        message: "Account created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    // Two simultaneous sign-ups for the same email hit the unique index.
    console.error("Error registering user:", error instanceof Error ? error.message : error);
    return fail("We couldn't create your account. Please try again.", 500);
  }
}
