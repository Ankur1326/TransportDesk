import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
// import { getSession } from "next-auth/react";

export async function PUT(request: Request) {
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
        const { _id, name, address, city, state, pincode, gstin, mobile, email } = await request.json();
        console.log(name, address, city, state, pincode, gstin, mobile, email);

        const customerId = _id;

        if (!customerId) {
            return Response.json(
                {
                    success: false,
                    message: "customerId is required",
                },
                {
                    status: 400,
                }
            );
        }

        // Check if the new name is already taken
        const existingCustomer: any = await Customer.findOne({ name });
        if (existingCustomer && existingCustomer._id.toString() !== customerId) {
            return Response.json(
                {
                    success: false,
                    message: "Customer with this name already exists",
                },
                {
                    status: 400,
                }
            );
        }

        // Find the category by ID and update it
        const updatedCustomer = await Customer.findByIdAndUpdate(
            customerId,
            { name, address, city, state, pincode, gstin, mobile, email },
            { new: true, runValidators: true }
        );

        if (!updatedCustomer) {
            return Response.json(
                {
                    success: false,
                    message: "Customer not found",
                },
                {
                    status: 404
                }
            );
        }

        return Response.json(
            {
                success: true,
                message: "Customer updated successfully",
                data: updatedCustomer
            },
            {
                status: 200
            }
        );

    } catch (error) {
        console.log("Error while updating Customer : ", error);
        return Response.json(
            {
                success: false,
                message: "Internal server error while Updating Customer",
                error
            },
            {
                status: 500
            }
        );
    }
}