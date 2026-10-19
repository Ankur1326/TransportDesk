"use client";

import { useEffect, useRef, useState } from "react";
import { useController, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
import { formatGstState, searchGstStates } from "@/lib/gstStates";

interface StateAutocompleteFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  label?: string;
  /** Hindi meaning shown in brackets after the label. */
  hi?: string;
  required?: boolean;
  error?: string;
  size?: "default" | "compact";
}

export function StateAutocompleteField<T extends FieldValues>({
  name,
  label = "State",
  hi,
  required,
  error,
  size = "compact",
}: StateAutocompleteFieldProps<T>) {
  const { control } = useFormContext<T>();
  const { field } = useController({ name, control });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCompact = size === "compact";

  const query: string = field.value ?? "";
  const results = searchGstStates(query);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label
          className={cn(
            "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-neutral-600",
            isCompact && "mb-0.5 text-[9.5px] tracking-[0.02em]"
          )}
        >
          {label}
          {hi && <span className="ml-1 text-[11px] font-medium normal-case tracking-normal text-neutral-500">({hi})</span>}
          {required && <span className="ml-1 text-error-600">*</span>}
        </label>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => {
          field.onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={field.onBlur}
        placeholder="GJ, 24 or Gujarat"
        className={cn(
          "h-10 w-full border border-neutral-300 bg-neutral-50 px-3 text-[13px] font-medium text-neutral-900 outline-none",
          "placeholder:text-neutral-400 placeholder:font-normal",
          "hover:border-neutral-400 hover:bg-white",
          "focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600",
          "transition-colors",
          isCompact && "h-8 px-2 text-[12px]",
          error && "border-error-500 bg-error-50 hover:border-error-500 focus:border-error-500 focus:ring-error-500"
        )}
      />

      {error && (
        <p className={cn("mt-1.5 text-[11px] font-medium text-error-600", isCompact && "mt-0.5 text-[10px]")}>
          {error}
        </p>
      )}

      {open && query.trim().length > 0 && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-card-hover">
          {results.map((s) => (
            <button
              key={s.stateCode}
              type="button"
              onClick={() => {
                field.onChange(formatGstState(s));
                setOpen(false);
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-neutral-50"
            >
              <span className="text-[12px] font-medium text-neutral-900">{formatGstState(s)}</span>
              <span className="text-[10px] text-neutral-500">State code: {s.stateCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}