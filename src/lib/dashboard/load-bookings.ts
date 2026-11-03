import dbConnect from "@/lib/db";
import { bookingPeriodMatch } from "@/lib/dashboard/loader-scopes";
import ConsignmentModel from "@/models/Consignment";
import { startOfIstMonth } from "@/lib/dashboard/periods";

export async function loadBookings(companyId: string): Promise<number> {
  await dbConnect();
  const now = new Date();
  const from = startOfIstMonth(now);
  const to = startOfIstMonth(now, 1);
  const [row] = await ConsignmentModel.aggregate<{ count: number }>([
    {
      $match: bookingPeriodMatch(companyId, {
        from,
        to,
        previousFrom: from,
        previousTo: to,
      }),
    },
    { $count: "count" },
  ]);
  return row?.count ?? 0;
}
