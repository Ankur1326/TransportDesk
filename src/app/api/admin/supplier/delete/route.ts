import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import { requireCompany, companyFilter } from "@/lib/company-scope";
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