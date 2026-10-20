"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Building2, Check, Loader2, Search } from "@/components/icons";
import type { FreightBillFormValues } from "@/lib/bill/validations";
import { searchCustomers, type CustomerOption } from "@/lib/bill/api";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/bills/create/ui";

export type PartyMode = "company" | "gst" | "manual";

const MODES: { id: PartyMode; label: string; hint: string }[] = [
  { id: "company", label: "Select Company", hint: "Pick a saved customer" },
  { id: "gst", label: "Search By GST", hint: "Find a saved customer by GSTIN" },
  { id: "manual", label: "Add Manually", hint: "Type the billing party's details" },
];

interface BillToPickerProps {
  mode: PartyMode | null;
  onModeChange: (mode: PartyMode) => void;
  /** Name of the chosen saved customer (company / GST modes). */
  partyName: string | null;
  onCustomerSelected: (customer: CustomerOption) => void;
  onClearParty: () => void;
}

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function CustomerSearch({
  label,
  hi,
  placeholder,
  minChars,
  emptyHint,
  onPick,
  upper,
}: {
  label: string;
  hi: string;
  placeholder: string;
  minChars: number;
  emptyHint: string;
  onPick: (c: CustomerOption) => void;
  upper?: boolean;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim());
  // Results are tagged with the query they answer, so "loading" is derived instead of set inside the effect.
  const [fetched, setFetched] = useState<{ q: string; list: CustomerOption[] } | null>(null);
  const active = debounced.length >= minChars;
  const loading = active && fetched?.q !== debounced;
  const results = fetched?.q === debounced ? fetched.list : [];

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    searchCustomers(debounced)
      .then((list) => !cancelled && setFetched({ q: debounced, list }))
      .catch(() => !cancelled && setFetched({ q: debounced, list: [] }));
    return () => {
      cancelled = true;
    };
  }, [debounced, active]);

  return (
    <div>
      <div className="relative">
        <Input
          autoFocus
          label={label}
          hi={hi}
          value={query}
          onChange={(e) => setQuery(upper ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={placeholder}
          startIcon={<Search className="h-4 w-4" aria-hidden="true" />}
        />
        {loading && <Loader2 className="absolute bottom-3 right-3 h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />}
      </div>

      {active && !loading && results.length === 0 && <p className="mt-2 text-xs text-slate-500">{emptyHint}</p>}

      {active && results.length > 0 && (
        <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {results.map((c) => (
            <li key={c._id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="focus-ring flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-brand-50"
              >
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{c.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                    {c.gstin ? ` · GSTIN ${c.gstin}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BillToPicker({ mode, onModeChange, partyName, onCustomerSelected, onClearParty }: BillToPickerProps) {
  const { register, watch, formState: { errors } } = useFormContext<FreightBillFormValues>();
  const billedTo = watch("billedTo");

  return (
    <SectionCard title="Bill To">
      <div role="radiogroup" aria-label="How to choose the billing party" className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => {
          const selected = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onModeChange(m.id)}
              className={cn(
                "focus-ring flex h-20 flex-col items-center justify-center rounded-xl border px-3 text-center transition",
                selected
                  ? "border-brand-700 bg-brand-700 text-white shadow-sm"
                  : "border-brand-300 bg-white text-brand-800 hover:bg-brand-50"
              )}
            >
              <span className="text-sm font-semibold">{m.label}</span>
              <span className={cn("mt-0.5 text-xs", selected ? "text-brand-100" : "text-slate-500")}>{m.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {!mode && <p className="text-sm text-slate-500">Choose how you want to pick who this bill is for.</p>}

        {/* Saved customer chosen */}
        {(mode === "company" || mode === "gst") && partyName && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-success-200 bg-success-50/60 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-600 text-white">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 text-sm">
                <p className="truncate text-base font-bold uppercase text-slate-900">{billedTo?.name}</p>
                {billedTo?.address && <p className="text-slate-600">{[billedTo.address, billedTo.city, billedTo.state, billedTo.pincode].filter(Boolean).join(", ")}</p>}
                <p className="mt-1 text-xs text-slate-600">
                  {billedTo?.gstin ? `GSTIN ${billedTo.gstin}` : "No GSTIN saved"}
                  {billedTo?.mobile ? ` · ${billedTo.mobile}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearParty}
              className="focus-ring shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-white"
            >
              Change
            </button>
          </div>
        )}

        {mode === "company" && !partyName && (
          <CustomerSearch
            label="Search customer"
            hi="ग्राहक खोजें"
            placeholder="Search customer by name, city or mobile…"
            minChars={0}
            emptyHint="No saved customer matches. Use “Add Manually” or add the customer first."
            onPick={onCustomerSelected}
          />
        )}

        {mode === "gst" && !partyName && (
          <CustomerSearch
            upper
            label="GST number"
            hi="जीएसटी नंबर"
            placeholder="Enter GST number (e.g. 08ABCDE1234F1Z5)"
            minChars={3}
            emptyHint="No saved customer has this GST number. Use “Add Manually” to enter the details."
            onPick={onCustomerSelected}
          />
        )}

        {mode === "manual" && (
          <div>
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">or enter details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input size="compact" label="Billing party name" hi="बिलिंग पार्टी का नाम" required placeholder="Company / person name" {...register("billedTo.name")} />
              <Input size="compact" label="GST number" hi="जीएसटी नंबर" placeholder="15-character GSTIN" maxLength={15} className="uppercase" {...register("billedTo.gstin")} />
              <Input size="compact" label="Contact number" hi="संपर्क नंबर" inputMode="tel" {...register("billedTo.mobile")} />
              <Input size="compact" label="Address" hi="पता" {...register("billedTo.address")} />
              <Input size="compact" label="City" hi="शहर" {...register("billedTo.city")} />
              <Input size="compact" label="State" hi="राज्य" {...register("billedTo.state")} />
              <Input size="compact" label="Country" hi="देश" placeholder="India" {...register("billedTo.country")} />
              <Input size="compact" label="Pin code" hi="पिन कोड" inputMode="numeric" maxLength={6} {...register("billedTo.pincode")} />
              <div className="sm:col-span-2">
                <Input size="compact" label="Email" hi="ईमेल" type="email" {...register("billedTo.email")} />
              </div>
            </div>
          </div>
        )}

        {errors.billedTo?.name && <p className="mt-2 text-xs text-red-600">{errors.billedTo.name.message}</p>}
        {errors.billedTo?.pincode && <p className="mt-2 text-xs text-red-600">{errors.billedTo.pincode.message}</p>}
      </div>
    </SectionCard>
  );
}
