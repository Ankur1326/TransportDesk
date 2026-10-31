import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { loadCompanySettings } from "@/lib/company-settings-server";
import { LorryHireSheet } from "@/components/lorry-hire/LorryHireSheet";
import { PrintToolbar } from "@/components/print/PrintToolbar";

/**
 * Bare, server-rendered lorry hire contract sheet — NO sidebar, session
 * provider or app shell. Same two jobs as /admin/lr/[id] and /admin/bill/[id]:
 *   1. The page headless Chromium loads to produce the PDF served by
 *      /api/admin/lorry-hires/[id]/pdf (JavaScript is off there, so nothing hydrates).
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
  if (!auth.ok || !mongoose.Types.ObjectId.isValid(id)) return { title: "Lorry Hire Contract" };
  await dbConnect();
  const doc = await LorryHireModel.findOne({ $and: [companyFilter(auth.companyId), { _id: id }] })
    .select("lhcNo")
    .lean();
  return { title: doc?.lhcNo ? `LHC-${doc.lhcNo.replace(/[^\w.-]+/g, "_")}` : "Lorry Hire Contract" };
}

export default async function LorryHireSheetPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const auth = await requireCompany();
  if (!auth.ok) redirect("/sign-in");

  await dbConnect();
  const [record, settings] = await Promise.all([
    LorryHireModel.findOne({ $and: [companyFilter(auth.companyId), { _id: id }] }).select("-pdfCache").lean(),
    loadCompanySettings(auth.companyId),
  ]);
  if (!record) notFound();

  // Dates / ObjectIds -> plain JSON, the same shape the API returns.
  const values = JSON.parse(JSON.stringify(record));

  return (
    <div className="bg-white">
      {first(query.toolbar) === "1" && <PrintToolbar title={`Lorry Hire ${values.lhcNo ?? ""}`.trim()} />}
      <div className="mx-auto max-w-4xl p-6 print:max-w-none print:p-0">
        <LorryHireSheet values={values} settings={settings} payments={values.payments} />
      </div>
    </div>
  );
}
