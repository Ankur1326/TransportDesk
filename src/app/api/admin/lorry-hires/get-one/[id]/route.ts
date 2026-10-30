import { NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { fail, isObjectId } from "@/lib/lorry-hire/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid contract id.", 400);

  try {
    await dbConnect();
    const doc = await LorryHireModel.findOne({ $and: [companyFilter(auth.companyId), { _id: id }] }).lean();
    if (!doc) return fail("Lorry hire contract not found.", 404);
    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error("Error while fetching lorry hire contract:", error);
    return fail("Error fetching lorry hire contract", 500);
  }
}
