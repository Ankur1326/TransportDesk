import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import { requireCompanyProfile, companyFilter } from "@/lib/company-scope";
import { dropLegacyUniqueIndex } from "@/lib/legacy-indexes";
import { parseOpeningBalance } from "@/lib/opening-balance";
import { parseSupplierInput, supplierSetFields } from "@/lib/supplier/validations";

/** Case-insensitive exact matching for names, so "Ram Roadlines" and "ram roadlines" are one supplier. */
const CI = { locale: "en", strength: 2 } as const;

export async function POST(request: Request) {
    const auth = await requireCompanyProfile();
    if (!auth.ok) return auth.response;

    await dbConnect();
    await dropLegacyUniqueIndex(Supplier, "name");

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
        }

        const input = parseSupplierInput(body);
        if (!input.ok) {
            return Response.json({ success: false, message: input.message }, { status: 400 });
        }

        const { openingBalance, balanceType } = body as { openingBalance?: unknown; balanceType?: unknown };
        const balance = parseOpeningBalance(openingBalance as never, balanceType as never);
        if (!balance.ok) {
            return Response.json({ success: false, message: balance.message }, { status: 400 });
        }

        const existing = await Supplier.exists({ $and: [companyFilter(auth.companyId), { name: input.data.name }] }).collation(CI);
        if (existing) {
            return Response.json({ success: false, message: "A supplier with this name already exists." }, { status: 409 });
        }

        // Nested bank fields are written as dotted paths for updates; a new document takes them as an object.
        const { bankDetails, ...rest } = input.data;
        const newSupplier = new Supplier({
            ...supplierSetFields(rest as typeof input.data),
            ...(bankDetails ? { bankDetails } : {}),
            openingBalance: balance.openingBalance,
            balanceType: balance.balanceType,
            // Server-controlled — never taken from the request body.
            companyId: auth.companyId,
            createdBy: auth.userId,
        });
        await newSupplier.save();

        return Response.json(
            { success: true, message: "Supplier created successfully", data: newSupplier },
            { status: 200 }
        );
    } catch (error) {
        if ((error as { code?: number })?.code === 11000) {
            return Response.json({ success: false, message: "A supplier with this name already exists." }, { status: 409 });
        }
        console.error("Error while creating new Supplier : ", error);
        return Response.json(
            { success: false, message: "Internal server error while creating new Supplier" },
            { status: 500 }
        );
    }
}
