"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { Loading } from "@/components/ui/Loading";
import { LorryHireForm } from "@/components/lorry-hire/form/LorryHireForm";
import { getApiErrorInfo, type ApiErrorInfo } from "@/lib/api/errors";
import { getLorryHire, type LorryHireRecord } from "@/lib/lorry-hire/api";
import { recordToFormValues } from "@/lib/lorry-hire/form-defaults";

export default function EditLorryHirePage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<LorryHireRecord | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getLorryHire(id)
      .then((r) => !cancelled && setRecord(r))
      .catch((e) => !cancelled && setError(getApiErrorInfo(e, "Couldn't load this contract.")));
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  if (error) return <ApiErrorState error={error} onRetry={() => { setError(null); setAttempt((a) => a + 1); }} />;
  if (!record) return <Loading fullPage label="Loading…" />;
  return <LorryHireForm mode="edit" initialValues={recordToFormValues(record)} record={record} />;
}
