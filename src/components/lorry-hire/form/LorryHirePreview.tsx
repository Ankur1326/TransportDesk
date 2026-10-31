"use client";
import { useFormContext, useWatch } from "react-hook-form";
import { LorryHireSheet } from "@/components/lorry-hire/LorryHireSheet";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import type { LorryHireRecord } from "@/lib/lorry-hire/api";
import type { LorryHireFormValues } from "@/lib/lorry-hire/validations";

/**
 * On-screen preview of the contract exactly as it prints, built from what is
 * currently typed in the form. Same overlay pattern as the bill preview.
 */
export function LorryHirePreview({ record, onClose }: { record?: LorryHireRecord; onClose: () => void }) {
  const { control } = useFormContext<LorryHireFormValues>();
  const values = useWatch({ control });
  const { settings } = useCompanySettings();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-2 print:static print:bg-transparent print:p-0">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-4 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="focus-ring rounded-lg bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        {/* Once a contract exists its payments live on the server, not in the form. */}
        <LorryHireSheet values={values} settings={settings} payments={record ? record.payments : undefined} />
      </div>
    </div>
  );
}
