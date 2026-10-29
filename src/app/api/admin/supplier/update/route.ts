import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import { requireCompany, companyFilter } from "@/lib/company-scope";
import { parseOpeningBalance } from "@/lib/opening-balance";
// import { getSession } from "next-auth/react";

export async function PUT(request: Request) {
    const auth = await requireCompany();
    if (!auth.ok) return auth.response;

    await dbConnect();

    // const session = await getSession({ request })

    // if (!session) {
    //     return Response.json(
    //         {
    //             success: false,
    //             message: "Unauthorized. Please log in."
    //         },
    //         {
    //             status: 401
    //         }
    //     );
    // }

    // Check if the user has admin role
    // if (session.user?.role !== "transporter") {
    //     return res.status(403).json({ error: "Forbidden. You do not have permission to perform this action." });
    // }

    try {
        const { _id, name, address, city, state, pincode, gstin, mobile, email, openingBalance, balanceType } = await request.json();

        const supplierId = _id;

        if (!supplierId) {
            return Response.json(
                {
                    success: false,
                    message: "supplierId is required",
                },
                {
                    status: 400,
                }
            );
        }

        const balance = parseOpeningBalance(openingBalance, balanceType);
        if (!balance.ok) {
            return Response.json({ success: false, message: balance.message }, { status: 400 });
        }

        // Check if the new name is already taken
        const existingSupplier: any = await Supplier.findOne({ name, ...companyFilter(auth.companyId) });
        if (existingSupplier && existingSupplier._id.toString() !== supplierId) {
            return Response.json(
                {
                    success: false,
                    message: "Supplier with this name already exists",
                },
                {
                    status: 400,
                }
            );
        }

        // Find the category by ID and update it
        const updatedSupplier = await Supplier.findOneAndUpdate(
            { _id: supplierId, ...companyFilter(auth.companyId) },
            { name, address, city, state, pincode, gstin, mobile, email, openingBalance: balance.openingBalance, balanceType: balance.balanceType },
            { new: true, runValidators: true }
        );

        if (!updatedSupplier) {
            return Response.json(
                {
                    success: false,
                    message: "Supplier not found",
                },
                {
                    status: 404
                }
            );
        }

        return Response.json(
            {
                success: true,
                message: "Supplier updated successfully",
                data: updatedSupplier
            },
            {
                status: 200
            }
        );

    } catch (error) {
        console.log("Error while updating Supplier : ", error);
        return Response.json(
            {
                success: false,
                message: "Internal server error while Updating Supplier",
                error
            },
            {
                status: 500
            }
        );
    }
}