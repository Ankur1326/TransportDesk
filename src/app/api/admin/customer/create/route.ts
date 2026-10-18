import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { getServerSession } from "next-auth";
// import { getSession } from "next-auth/react";

export async function POST(request: Request) {
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

    try {
        const { name, address, city = "", state = "", pincode = "", gstin = "", mobile, email } = await request.json();
        // console.log(name, address, city, state, pincode, gstin, mobile, email);

        // Fixing validation to check for undefined for isActive
        if (!name) {
            return Response.json(
                {
                    success: false,
                    message: "Customer name is required."
                },
                {
                    status: 400
                }
            );
        }

        // Check if the category already exists by name
        const existingCustomer = await Customer.findOne({ name });
        console.log("existingCustomer : ", existingCustomer);

        if (existingCustomer) {
            return Response.json(
                {
                    success: true,
                    message: "Customer with this name already exists",
                },
                { status: 400 }
            )
        }

        const newCustomer = new Customer({
            name, address, city, state, pincode, gstin, mobile, email
        });

        // Save the new category to the database
        await newCustomer.save();

        return Response.json(
            {
                success: true,
                message: "New Customer tag created successfully",
                data: newCustomer,
            },
            {
                status: 200
            }
        );

    } catch (error) {
        console.log("Error while creating new Customer : ", error);
        return Response.json(
            {
                success: false,
                message: "Internal server error while creating new Customer",
                error
            },
            {
                status: 500
            }
        );
    }
}