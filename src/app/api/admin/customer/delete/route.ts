import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { requireCompany, companyFilter } from "@/lib/company-scope";
// import { getSession } from "next-auth/react";

export async function DELETE(request: Request) {
    const auth = await requireCompany();
    if (!auth.ok) return auth.response;

    await dbConnect();

    try {
        const data = await request.json();
        const customerId = data._id

        // Fixing validation to check for undefined for isActive
        if (!customerId) {
            return Response.json(
                {
                    success: false,
                    message: "Customer ID is required."
                },
                {
                    status: 400
                }
            );
        }

        const result = await Customer.deleteOne({ _id: customerId, ...companyFilter(auth.companyId) });

        if (result.deletedCount === 0) {
            return Response.json(
                {
                    success: false,
                    message: "Customer not found.",
                },
                {
                    status: 404,
                }
            );
        }

        return Response.json(
            {
                success: true,
                message: "Customer deleted successfully.",
            },
            {
                status: 200,
            }
        );

    } catch (error) {
        console.log("Error while deleting Customer : ", error);
        return Response.json(
            {
                success: false,
                message: "Internal server error while Customer",
                error
            },
            {
                status: 500
            }
        );
    }
} 