import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import User from "@/models/User";

interface Options {
  companyName?: string;
  /**
   * `true`  -> brand-new company id (used at sign-up).
   * `false` -> reuse the user's own id as the company id. Only for accounts
   *            created before companies existed, so their existing consignments
   *            and settings (stored under that id) stay attached.
   */
  fresh?: boolean;
}

/**
 * Returns the user's companyId, creating the Company (and linking it to the
 * user) if the user doesn't have one yet. Safe to call repeatedly / concurrently.
 */
export async function ensureUserCompany(userId: string, options: Options = {}): Promise<string> {
  await dbConnect();

  const user = (await User.findById(userId).select("companyId fullName").lean()) as
    | { companyId?: string; fullName?: string }
    | null;
  if (!user) throw new Error("User not found");
  if (user.companyId) return user.companyId;

  const companyObjectId = options.fresh
    ? new mongoose.Types.ObjectId()
    : new mongoose.Types.ObjectId(userId);

  await Company.updateOne(
    { _id: companyObjectId },
    { $setOnInsert: { name: options.companyName ?? user.fullName ?? "", ownerUserId: userId } },
    { upsert: true }
  );

  // Only set it if nobody else did in the meantime.
  const linked = (await User.findOneAndUpdate(
    { _id: userId, $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: "" }] },
    { $set: { companyId: companyObjectId.toString() } },
    { new: true }
  )
    .select("companyId")
    .lean()) as { companyId?: string } | null;
  if (linked?.companyId) return linked.companyId;

  const current = (await User.findById(userId).select("companyId").lean()) as { companyId?: string } | null;
  if (!current?.companyId) throw new Error("Could not assign a company to the user");
  return current.companyId;
}
