"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface ComboboxItem {
  id: string;
  label: string;
  subLabel?: string;
  /** Extra text matched against the search query but never rendered — lets a
   *  search term match a field that isn't shown, e.g. a state code. */
  keywords?: string;
}

interface ComboboxProps {
  label?: string;
  placeholder?: string;
  items: ComboboxItem[];
  onSelect: (item: ComboboxItem) => void;
  /** Rendered as a trailing row in the results list, e.g. "+ Add New Customer". */
  onCreateNew?: () => void;
  createNewLabel?: string;
  className?: string;
  /**
   * Visual density. "default" preserves the original size used across the
   * app; "compact" is a tighter variant for dense forms (e.g. the billing
   * form) and does not change behavior.
   */
  size?: "default" | "compact";
}

export function Combobox({
  label,
  placeholder = "Search…",
  items,
  onSelect,
  onCreateNew,
  createNewLabel = "+ Add New",
  className,
  size = "default",
}: ComboboxProps) {
  const isCompact = size === "compact";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const filtered =
    query.trim().length === 0
      ? items
      : items.filter((item) =>
          `${item.label} ${item.subLabel ?? ""} ${item.keywords ?? ""}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        );

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
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "mb-1.5 block text-body-sm font-medium text-neutral-800",
            isCompact && "mb-0.5 text-[9.5px] font-semibold uppercase tracking-[0.02em] text-neutral-600"
          )}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400",
            isCompact && "left-2 h-3.5 w-3.5"
          )}
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          aria-autocomplete="list"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className={cn(
            "focus-ring h-11 w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-9 text-body text-neutral-900 placeholder:text-neutral-400 transition-colors hover:border-neutral-400",
            isCompact && "h-8 rounded-md pl-7 pr-7 text-[12px]"
          )}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600",
              isCompact && "right-2"
            )}
          >
            <X className={cn("h-4 w-4", isCompact && "h-3.5 w-3.5")} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-card-hover"
        >
          {filtered.length === 0 && (
            <p className="px-3.5 py-2.5 text-body-sm text-neutral-500">No matches found.</p>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full flex-col items-start px-3.5 py-2.5 text-left hover:bg-neutral-50"
            >
              <span className="text-body-sm font-medium text-neutral-900">{item.label}</span>
              {item.subLabel && <span className="text-caption text-neutral-500">{item.subLabel}</span>}
            </button>
          ))}
          {onCreateNew && (
            <button
              type="button"
              onClick={() => {
                onCreateNew();
                setOpen(false);
              }}
              className="flex w-full items-center px-3.5 py-2.5 text-left text-body-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              {createNewLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}