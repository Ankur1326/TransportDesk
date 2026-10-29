import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { loadCompanySettings } from "@/lib/company-settings-server";
import { FreightBillSheet } from "@/components/bills/Freightbillprintpreview";
import { PrintToolbar } from "@/components/print/PrintToolbar";

/**
 * Bare, server-rendered freight-bill sheet — NO sidebar, session provider or
 * app shell. Same two jobs as /admin/lr/[id]:
 *   1. The page headless Chromium loads to produce the PDF served by
 *      /api/admin/bills/[id]/pdf (JavaScript is off there, so nothing hydrates).
 *   2. The fallback when Chromium can't run: the PDF route redirects here with
 *      ?toolbar=1 so the user can Print / Save as PDF.
 *
 * /admin/* is protected by src/proxy.ts and the page re-checks the session and
 * scopes the query to the signed-in company.
 */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ toolbar?: string | string[] }>;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Becomes the PDF's document title (shown in the browser's PDF viewer tab). */
export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { id } = await params;
  const auth = await requireCompany();
  if (!auth.ok || !mongoose.Types.ObjectId.isValid(id)) return { title: "Bill" };
  await dbConnect();
  const bill = await FreightBillModel.findOne({ _id: id, ...companyFilter(auth.companyId) })
    .select("billNo")
    .lean();
  return { title: bill?.billNo ? `Bill-${bill.billNo}` : "Bill" };
}

export default async function BillSheetPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const auth = await requireCompany();
  if (!auth.ok) redirect("/sign-in");

  await dbConnect();
  const [record, settings] = await Promise.all([
    FreightBillModel.findOne({ _id: id, ...companyFilter(auth.companyId) }).lean(),
    loadCompanySettings(auth.companyId),
  ]);
  if (!record) notFound();

  // Dates / ObjectIds -> plain JSON, the same shape the API returns.
  const values = JSON.parse(JSON.stringify(record));

  return (
    <div className="bg-white">
      {first(query.toolbar) === "1" && <PrintToolbar title={`Bill ${values.billNo ?? ""}`.trim()} />}
      <div className="mx-auto max-w-5xl p-8 print:max-w-none print:p-0">
        <FreightBillSheet values={values} settings={settings} />
      </div>
    </div>
  );
}
