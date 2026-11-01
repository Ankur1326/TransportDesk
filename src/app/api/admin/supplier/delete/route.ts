import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import { requireCompany, companyFilter } from "@/lib/company-scope";
import LorryHireContractModel from "@/models/LorryHireContract";
import LorryHireModel from "@/models/LorryHire";
import PaymentModel from "@/models/Payment";
// import { getSession } from "next-auth/react";

export async function DELETE(request: Request) {
    const auth = await requireCompany();
    if (!auth.ok) return auth.response;

    await dbConnect();

    try {
        const data = await request.json();
        const supplierId = data._id

        // Fixing validation to check for undefined for isActive
        if (!supplierId) {
            return Response.json(
                {
                    success: false,
                    message: "Supplier ID is required."
                },
                {
                    status: 400
                }
            );
        }

        // A supplier with contracts or payments would leave orphaned ledger rows.
        const scope = companyFilter(auth.companyId);
        const [hasContracts, hasHires, hasPayments] = await Promise.all([
            LorryHireContractModel.exists({ $and: [scope, { supplierId }] }),
            LorryHireModel.exists({ $and: [scope, { "supplier.supplierId": supplierId }] }),
            PaymentModel.exists({ $and: [scope, { partyType: "supplier", partyId: supplierId }] }),
        ]);
        if (hasContracts || hasHires || hasPayments) {
            return Response.json(
                { success: false, message: "This supplier has lorry hire contracts or payments. Delete or move those first." },
                { status: 409 }
            );
        }

        const result = await Supplier.deleteOne({ _id: supplierId, ...companyFilter(auth.companyId) });

        if (result.deletedCount === 0) {
            return Response.json(
                {
                    success: false,
                    message: "Supplier not found.",
                },
                {
                    status: 404,
                }
            );
        }

        return Response.json(
            {
                success: true,
                message: "Supplier deleted successfully.",
            },
            {
                status: 200,
            }
        );

    } catch (error) {
        console.log("Error while deleting Supplier : ", error);
        return Response.json(
            {
                success: false,
                message: "Internal server error while Supplier",
                error
            },
            {
                status: 500
            }
        );
    }
} 