"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, Loader2 } from "@/components/icons";
import { Button } from "@/components/Button";
import { LorryCopy, LRStyles } from "@/components/billing/Printpreview";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getConsignment, getApiErrorMessage, type ConsignmentRecord } from "@/lib/api/consignments";

export default function PrintLrPage() {
  const { id } = useParams<{ id: string }>();
  const { settings, isLoading: settingsLoading, error: settingsError } = useCompanySettings();
  const [record, setRecord] = useState<ConsignmentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoPrinted = useRef(false);

  useEffect(() => {
    getConsignment(id)
      .then((r) => {
        setRecord(r);
        document.title = `LR-${r.consignmentNumber}`; // default PDF file name
      })
      .catch((e) => setError(getApiErrorMessage(e, "Couldn't load this consignment.")));
  }, [id]);

  const ready = Boolean(record) && !settingsLoading && !settingsError && !error;

  // Optional: /admin/print/<id>?print=1 opens the print dialog automatically
  useEffect(() => {
    if (!ready || autoPrinted.current) return;
    if (new URLSearchParams(window.location.search).get("print") !== "1") return;
    autoPrinted.current = true;
    const t = setTimeout(() => window.print(), 600); // let images/fonts settle
    return () => clearTimeout(t);
  }, [ready]);

  const failed = error || settingsError;

  return (
    <div className="lr-preview">
      <LRStyles />

      <div className="lr-toolbar print:hidden">
        <span className="text-body-sm font-semibold text-neutral-700">
          {record ? `LR ${record.consignmentNumber}` : "Loading…"}
        </span>
        <Button size="sm" onClick={() => window.print()} disabled={!ready}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print / Save as PDF
        </Button>
      </div>

      <div className="lr-document">
        {failed ? (
          <div className="lr-no-selection print:hidden" role="alert">{String(failed)}</div>
        ) : !ready ? (
          <div className="lr-no-selection print:hidden" role="status">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" aria-hidden="true" />
            Loading…
          </div>
        ) : (
          // no copyName, so no "LORRY COPY" anywhere
          <LorryCopy values={record as any} company={settings} lrFormat={settings.lrFormat} />
        )}
      </div>
    </div>
  );
}