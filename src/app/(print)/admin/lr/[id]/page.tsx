import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { loadCompanySettings } from "@/lib/company-settings-server";
import { LR_COPY_LABELS, parseCopies } from "@/lib/lr-copies";
import { LorryCopy, LRStyles } from "@/components/billing/Printpreview";
import { PrintToolbar } from "@/components/print/PrintToolbar";

/**
 * Bare, server-rendered LR sheet — NO sidebar, session provider or app shell.
 *
 * Two jobs:
 *   1. It is the page headless Chromium loads to produce the PDF served by
 *      /api/admin/consignments/[id]/pdf (JavaScript is switched off there, so
 *      nothing hydrates).
 *   2. It is the fallback when Chromium can't run on the host: the PDF route
 *      redirects here with ?toolbar=1 so the user can Print / Save as PDF.
 *
 * Lives in the `(print)` route group so the `(app)` layout never wraps it.
 * /admin/* is still protected by src/proxy.ts and the page re-checks the
 * session and scopes the query to the signed-in company.
 */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copies?: string | string[]; toolbar?: string | string[] }>;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Becomes the PDF's document title (shown in the browser's PDF viewer tab). */
export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { id } = await params;
  const auth = await requireCompany();
  if (!auth.ok || !mongoose.Types.ObjectId.isValid(id)) return { title: "LR" };
  await dbConnect();
  const lr = await ConsignmentModel.findOne({ _id: id, ...companyFilter(auth.companyId) })
    .select("consignmentNumber")
    .lean();
  return { title: lr?.consignmentNumber ? `LR-${lr.consignmentNumber}` : "LR" };
}

export default async function LrSheetPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const auth = await requireCompany();
  if (!auth.ok) redirect("/sign-in");

  const parsed = parseCopies(first(query.copies));
  if (!parsed.ok) notFound();

  await dbConnect();
  const [record, settings] = await Promise.all([
    ConsignmentModel.findOne({ _id: id, ...companyFilter(auth.companyId) }).lean(),
    loadCompanySettings(auth.companyId),
  ]);
  if (!record) notFound();

  // Dates / ObjectIds -> plain JSON, the same shape the API returns.
  const values = JSON.parse(JSON.stringify(record));
  const copies: (string | undefined)[] = parsed.copies.length
    ? parsed.copies.map((key) => LR_COPY_LABELS[key])
    : [undefined]; // single copy with no "LORRY COPY" label

  return (
    <div className="lr-preview">
      <LRStyles />
      {first(query.toolbar) === "1" && (
        <PrintToolbar title={`LR ${values.consignmentNumber ?? ""}`.trim()} />
      )}
      <div className="lr-document">
        {copies.map((copyName, index) => (
          <LorryCopy
            key={copyName ?? `single-${index}`}
            values={values}
            copyName={copyName}
            company={settings}
            lrFormat={settings.lrFormat}
          />
        ))}
      </div>
    </div>
  );
}
