"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface IconSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface IconSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: IconSelectOption[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

/**
 * A select whose rows can carry an icon. The native <select> can't draw SVGs
 * inside its options, so this is a small listbox that looks like the flat
 * <Select> / <Input> and works from the keyboard (arrows, Home/End, Enter,
 * Escape, type to jump).
 */
export function IconSelect({ label, value, onChange, options, placeholder = "Select…", error, required, className }: IconSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const uid = useId();
  const listId = `${uid}-list`;

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const pick = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    const act = (fn: () => void) => {
      e.preventDefault();
      fn();
    };
    if (e.key === "ArrowDown") act(() => setActive((a) => Math.min(options.length - 1, a + 1)));
    else if (e.key === "ArrowUp") act(() => setActive((a) => Math.max(0, a - 1)));
    else if (e.key === "Home") act(() => setActive(0));
    else if (e.key === "End") act(() => setActive(options.length - 1));
    else if (e.key === "Enter" || e.key === " ") act(() => pick(active));
    else if (e.key === "Escape") act(() => setOpen(false));
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      // Type a few letters to jump to a row.
      const now = Date.now();
      typed.current = { text: (now - typed.current.at > 700 ? "" : typed.current.text) + e.key.toLowerCase(), at: now };
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label && (
        <label id={`${uid}-label`} className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-600">
          {label}
          {required && <span className="ml-0.5 text-error-600">*</span>}
        </label>
      )}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={label ? `${uid}-label` : undefined}
        aria-invalid={error ? true : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "focus-ring flex h-10 w-full items-center gap-2 rounded-none border-0 border-b border-neutral-300 bg-neutral-100 px-3 text-left text-[13px] font-medium text-neutral-900 transition-colors hover:border-neutral-400 hover:bg-neutral-200/60",
          open && "bg-white",
          error && "bg-error-50 hover:bg-error-50 border-error-500"
        )}
      >
        {selected?.icon && <span className="flex shrink-0 items-center">{selected.icon}</span>}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "font-normal text-neutral-500")}>{selected ? selected.label : placeholder}</span>
        <svg viewBox="0 0 20 20" className={cn("h-4 w-4 shrink-0 text-neutral-500 transition-transform", open && "rotate-180")} aria-hidden="true">
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={label ? `${uid}-label` : undefined}
          className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto border border-neutral-200 bg-white shadow-lg"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5 text-[13px] text-neutral-800",
                  i === active && "bg-brand-50",
                  isSelected && "font-semibold text-neutral-900"
                )}
              >
                <span className="flex w-16 shrink-0 items-center justify-center">{o.icon}</span>
                <span className="min-w-0 flex-1">{o.label}</span>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="mt-1 text-[11px] font-medium text-error-600">{error}</p>}
    </div>
  );
}
