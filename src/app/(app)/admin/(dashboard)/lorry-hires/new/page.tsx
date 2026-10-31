"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CompanyProfileGate } from "@/components/admin/CompanyProfileGate";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { Loading } from "@/components/ui/Loading";
import { LorryHireForm } from "@/components/lorry-hire/form/LorryHireForm";
import { getApiErrorInfo, type ApiErrorInfo } from "@/lib/api/errors";
import { fetchNextLhcNo, getLorryHire } from "@/lib/lorry-hire/api";
import { buildDefaultValues, recordToFormValues } from "@/lib/lorry-hire/form-defaults";
import type { LorryHireFormValues } from "@/lib/lorry-hire/validations";

/** New contract; `?copy=<id>` starts from an existing one (Duplicate). */
function NewLorryHire() {
  const copyId = useSearchParams().get("copy");
  const [values, setValues] = useState<LorryHireFormValues | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lhcNo = await fetchNextLhcNo();
        const next = copyId ? recordToFormValues(await getLorryHire(copyId), { lhcNo, asCopy: true }) : buildDefaultValues(lhcNo);
        if (!cancelled) setValues(next);
      } catch (e) {
        if (!cancelled) setError(getApiErrorInfo(e, "Couldn't start a new contract."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copyId, attempt]);

  if (error) return <ApiErrorState error={error} onRetry={() => { setError(null); setAttempt((a) => a + 1); }} />;
  if (!values) return <Loading fullPage label="Loading…" />;
  return <LorryHireForm mode="create" initialValues={values} />;
}

export default function NewLorryHirePage() {
  return (
    <Suspense fallback={<Loading fullPage label="Loading…" />}>
      <CompanyProfileGate action="create a lorry hire contract">
        <NewLorryHire />
      </CompanyProfileGate>
    </Suspense>
  );
}
