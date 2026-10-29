import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { requireCompanyProfile, companyFilter } from "@/lib/company-scope";
import { dropLegacyUniqueIndex } from "@/lib/legacy-indexes";
import { parseOpeningBalance } from "@/lib/opening-balance";
// import { getSession } from "next-auth/react";

export async function POST(request: Request) {
    const auth = await requireCompanyProfile();
    if (!auth.ok) return auth.response;

    await dbConnect();
    await dropLegacyUniqueIndex(Customer, "name");

    try {
        const { name, address, city = "", state = "", pincode = "", gstin = "", mobile, email, openingBalance, balanceType } = await request.json();
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

        const balance = parseOpeningBalance(openingBalance, balanceType);
        if (!balance.ok) {
            return Response.json({ success: false, message: balance.message }, { status: 400 });
        }

        // Check if the category already exists by name
        const existingCustomer = await Customer.findOne({ name, ...companyFilter(auth.companyId) });
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
            name, address, city, state, pincode, gstin, mobile, email,
            openingBalance: balance.openingBalance,
            balanceType: balance.balanceType,
            // Server-controlled — never taken from the request body.
            companyId: auth.companyId,
            createdBy: auth.userId,
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