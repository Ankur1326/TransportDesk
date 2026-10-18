import dbConnect from "@/lib/db";
import Consignment from "@/models/Consignment";

const ALLOWED = new Set(["status", "payment.status", "payment.amountReceived", "podUrl"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;
  const body = await req.json();

  const $set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (ALLOWED.has(k)) $set[k] = v;
  if (!Object.keys($set).length) {
    return Response.json({ success: false, message: "Nothing to update" }, { status: 400 });
  }

  const doc = await Consignment.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  if (!doc) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  return Response.json({ success: true, data: doc });
}