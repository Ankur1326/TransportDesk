"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CompanyProfileGate } from "@/components/admin/CompanyProfileGate";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { Loading } from "@/components/ui/Loading";
import { LorryHireForm } from "@/components/lorry-hire/form/LorryHireForm";
import { getApiErrorInfo, type ApiErrorInfo } from "@/lib/api/errors";
import { fetchNextLhcNo, getLorryHire, type LorryHireRecord } from "@/lib/lorry-hire/api";
import { buildDefaultValues, recordToFormValues } from "@/lib/lorry-hire/form-defaults";
import type { LorryHireFormValues } from "@/lib/lorry-hire/validations";

interface Loaded {
    /** Which request this was loaded for — a stale result never renders. */
    key: string;
    values: LorryHireFormValues;
    record?: LorryHireRecord;
}

function LorryHirePage() {
    const params = useSearchParams();
    const editId = params.get("id");
    const copyId = params.get("copy");
    const key = editId ? `edit:${editId}` : copyId ? `copy:${copyId}` : "new";

    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [error, setError] = useState<ApiErrorInfo | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (editId) {
                    const record = await getLorryHire(editId);
                    if (!cancelled) setLoaded({ key, values: recordToFormValues(record), record });
                    return;
                }
                const lhcNo = await fetchNextLhcNo();
                const values = copyId
                    ? recordToFormValues(await getLorryHire(copyId), { lhcNo, asCopy: true })
                    : buildDefaultValues(lhcNo);
                if (!cancelled) setLoaded({ key, values });
            } catch (e) {
                if (!cancelled) setError(getApiErrorInfo(e, editId ? "Couldn't load this contract." : "Couldn't start a new contract."));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [editId, copyId, key, attempt]);

    if (error) return <ApiErrorState error={error} onRetry={() => { setError(null); setAttempt((a) => a + 1); }} />;
    if (!loaded || loaded.key !== key) return <Loading fullPage label={editId ? "Loading contract…" : "Loading…"} />;

    return (
        <LorryHireForm
            key={loaded.key}
            mode={loaded.record ? "edit" : "create"}
            initialValues={loaded.values}
            record={loaded.record}
        />
    );
}

export default function LorryHireNewPage() {
    return (
        <Suspense fallback={<Loading fullPage label="Loading…" />}>
            <CompanyProfileGate action="create a lorry hire contract" editParam="id">
                <LorryHirePage />
            </CompanyProfileGate>
        </Suspense>
    );
}