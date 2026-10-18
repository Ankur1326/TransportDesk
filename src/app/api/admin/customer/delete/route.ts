import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { getServerSession } from "next-auth";
// import { getSession } from "next-auth/react";

export async function DELETE(request: Request) {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return Response.json(
            {
                success: false,
                message: "Unauthorized. Please log in."
            },
            {
                status: 401
            }
        );
    }

    if (session.user?.role !== "transporter") {
        return Response.json(
            {
                success: false,
                message: "Forbidden. You do not have permission to perform this action"
            },
            {
                status: 403
            }
        );
    }

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

        const result = await Customer.deleteOne({ _id: customerId });

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