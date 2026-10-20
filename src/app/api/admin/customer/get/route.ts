import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { requireCompany, companyFilter } from "@/lib/company-scope";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: Request) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const currentPage = Math.max(parseInt(searchParams.get("currentPage") || "1", 10) || 1, 1);
  const itemsPerPage = Math.min(Math.max(parseInt(searchParams.get("itemsPerPage") || "5", 10) || 5, 1), 100); // cap at 100
  const search = (searchParams.get("search") || "").trim();
  const name = (searchParams.get("name") || "").trim();   // still supported for your list page
  const state = (searchParams.get("state") || "").trim();

  try {
    const filter: Record<string, any> = {};

    // Free-text search across the fields people actually type
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ name: rx }, { city: rx }, { state: rx }, { gstin: rx }, { mobile: rx }];
    }
    if (name) filter.name = { $regex: escapeRegex(name), $options: "i" };
    if (state) filter.state = { $regex: escapeRegex(state), $options: "i" };

    // Always limit to the signed-in company ($and so it can't clash with the search $or).
    const scoped = { $and: [companyFilter(auth.companyId), filter] };

    const skip = (currentPage - 1) * itemsPerPage;

    const [customers, totalCustomers] = await Promise.all([
      Customer.find(scoped)
        .sort({ name: 1 })       // stable, alphabetical dropdown
        .skip(skip)
        .limit(itemsPerPage)
        .lean()                  // plain objects, noticeably faster
        .exec(),
      Customer.countDocuments(scoped).exec(),
    ]);

    return Response.json(
      {
        success: true,
        message: "Customers fetched successfully",
        data: {
          customers,
          totalCustomers,
          currentPage,
          totalPages: Math.ceil(totalCustomers / itemsPerPage),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching Customers: ", error);
    return Response.json(
      { success: false, message: "Internal server error while fetching Customers" },
      { status: 500 }
    );
  }
}