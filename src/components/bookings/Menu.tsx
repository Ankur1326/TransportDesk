"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Menu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-body-sm font-medium text-sky-600 hover:bg-sky-50 [&>svg]:h-4 [&>svg]:w-4"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 top-full z-30 mt-1 min-w-52 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon, children, onClick, danger, disabled,
}: {
  icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-body-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300 ${
        danger ? "text-error-600" : "text-neutral-700"
      }`}
    >
      <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div role="separator" className="my-1 h-px bg-neutral-100" />;
}
