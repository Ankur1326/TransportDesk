import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import { requireCompany, companyFilter } from "@/lib/company-scope";
import LorryHireContractModel from "@/models/LorryHireContract";
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
        const [hasContracts, hasPayments] = await Promise.all([
            LorryHireContractModel.exists({ $and: [scope, { supplierId }] }),
            PaymentModel.exists({ $and: [scope, { partyType: "supplier", partyId: supplierId }] }),
        ]);
        if (hasContracts || hasPayments) {
            return Response.json(
                { success: false, message: "This supplier has contracts or payments. Delete those first." },
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