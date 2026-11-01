import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import { requireCompany, companyFilter } from "@/lib/company-scope";
import { parseOpeningBalance } from "@/lib/opening-balance";
import { parseSupplierInput, supplierSetFields, supplierUnsetFields } from "@/lib/supplier/validations";
import { isObjectId } from "@/lib/lorry-hire/server";

const CI = { locale: "en", strength: 2 } as const;

export async function PUT(request: Request) {
    const auth = await requireCompany();
    if (!auth.ok) return auth.response;

    await dbConnect();

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
        }

        const { _id: supplierId, openingBalance, balanceType } = body as { _id?: unknown; openingBalance?: unknown; balanceType?: unknown };
        if (!supplierId) {
            return Response.json({ success: false, message: "supplierId is required" }, { status: 400 });
        }
        if (!isObjectId(supplierId)) {
            return Response.json({ success: false, message: "Invalid supplier id." }, { status: 400 });
        }

        const input = parseSupplierInput(body);
        if (!input.ok) {
            return Response.json({ success: false, message: input.message }, { status: 400 });
        }

        const balance = parseOpeningBalance(openingBalance as never, balanceType as never);
        if (!balance.ok) {
            return Response.json({ success: false, message: balance.message }, { status: 400 });
        }

        // The new name must not belong to a different supplier of this company.
        const clash = await Supplier.findOne({ $and: [companyFilter(auth.companyId), { name: input.data.name }] })
            .collation(CI)
            .select("_id")
            .lean();
        if (clash && String(clash._id) !== supplierId) {
            return Response.json({ success: false, message: "A supplier with this name already exists." }, { status: 409 });
        }

        // Only the fields that were sent are changed, so a form that doesn't know
        // about the bank / PAN block can't blank them.
        const updatedSupplier = await Supplier.findOneAndUpdate(
            { _id: supplierId, ...companyFilter(auth.companyId) },
            {
                $set: { ...supplierSetFields(input.data), openingBalance: balance.openingBalance, balanceType: balance.balanceType },
                ...(Object.keys(supplierUnsetFields(input.data)).length > 0 ? { $unset: supplierUnsetFields(input.data) } : {}),
            },
            { new: true, runValidators: true }
        );

        if (!updatedSupplier) {
            return Response.json({ success: false, message: "Supplier not found" }, { status: 404 });
        }

        return Response.json({ success: true, message: "Supplier updated successfully", data: updatedSupplier }, { status: 200 });
    } catch (error) {
        if ((error as { code?: number })?.code === 11000) {
            return Response.json({ success: false, message: "A supplier with this name already exists." }, { status: 409 });
        }
        console.error("Error while updating Supplier : ", error);
        return Response.json({ success: false, message: "Internal server error while Updating Supplier" }, { status: 500 });
    }
}
