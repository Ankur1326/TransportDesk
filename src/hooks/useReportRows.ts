"use client";
import { useEffect, useState } from "react";

export interface ReportState<T, S> {
  rows: T[];
  summary: S | null;
  totalItems: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Loads a paginated report endpoint. `loading` is derived from a request key,
 * so the effect only ever sets state from the fetch callbacks.
 */
export function useReportRows<T, S = never>(
  endpoint: string,
  params: Record<string, string | number | undefined>
): ReportState<T, S> {
  const [data, setData] = useState<{ rows: T[]; summary: S | null; totalItems: number; totalPages: number }>({
    rows: [],
    summary: null,
    totalItems: 0,
    totalPages: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [attempt, setAttempt] = useState(0);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const key = `${endpoint}?${qs}#${attempt}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`${endpoint}?${qs}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load data.");
        if (cancelled) return;
        setData({
          rows: json.rows ?? [],
          summary: (json.totals ?? null) as S | null,
          totalItems: json.totalItems ?? 0,
          totalPages: json.totalPages ?? 1,
        });
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data.");
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(key);
      });
    return () => {
      cancelled = true;
    };
    // `key` fully describes endpoint + params + retry attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ...data, loading: loadedKey !== key, error, retry: () => setAttempt((a) => a + 1) };
}
