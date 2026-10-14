import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { syncLegacyChargeFields } from "@/lib/charges";

function isValidObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ [key: string]: string | string[] }> }
) {

    await dbConnect();
    const resolvedParams = await params;
    const id = typeof resolvedParams.id === "string" ? resolvedParams.id : Array.isArray(resolvedParams.id) ? resolvedParams.id[0] : "";

    if (!isValidObjectId(id)) {
        return NextResponse.json({ success: false, message: "Invalid consignment id" }, { status: 400 });
    }

    try {
        const body = await request.json();
        console.log("body : ", body)
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
        }
        if (body.charges && typeof body.charges === "object" && !Array.isArray(body.charges)) {
            body.charges = syncLegacyChargeFields(body.charges);
        }

        const consignment = await ConsignmentModel.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        console.log("consignment : ", consignment)
        if (!consignment) {
            console.log("Consignment not found : ")
            return NextResponse.json({ success: false, message: "Consignment not found" }, { status: 404 });
        }

        return NextResponse.json(
            { success: true, message: "Consignment updated successfully", data: consignment },
            { status: 200 }
        );
    } catch (error) {
        console.log("Error while patching consignment: ", error);
        return NextResponse.json({ success: false, message: "Error updating consignment" }, { status: 500 });
    }
}