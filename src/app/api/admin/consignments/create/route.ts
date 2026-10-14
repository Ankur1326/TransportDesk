import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { billingFormSchema } from "@/lib/validations/billing";
import { syncLegacyChargeFields } from "@/lib/charges";

/**
 * POST /api/consignments
 *
 * Body: BillingFormValues (validated with billingFormSchema).
 * Creates a new consignment. Fails with 409 if the consignment number
 * already exists.
 */
export async function POST(request: NextRequest) {
    await dbConnect();

    try {
        const body = await request.json();
        const parsed = billingFormSchema.parse(body);
        parsed.charges = syncLegacyChargeFields(parsed.charges);
        const existing = await ConsignmentModel.findOne({
            consignmentNumber: parsed.consignmentNumber,
        }).lean();

        if (existing) {
            return NextResponse.json(
                {
                    success: false,
                    message: `A consignment with number ${parsed.consignmentNumber} already exists.`,
                },
                { status: 409 }
            );
        }

        const consignment = await ConsignmentModel.create(parsed);

        return NextResponse.json(
            {
                success: true,
                message: "Consignment created successfully",
                data: consignment,
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Validation failed",
                    errors: error.flatten(),
                },
                { status: 400 }
            );
        }

        // Mongo duplicate-key race condition (unique index on consignmentNumber)
        if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000) {
            return NextResponse.json(
                { success: false, message: "A consignment with this number already exists." },
                { status: 409 }
            );
        }

        console.log("Error while creating consignment: ", error);
        return NextResponse.json(
            { success: false, message: "Error creating consignment" },
            { status: 500 }
        );
    }
}