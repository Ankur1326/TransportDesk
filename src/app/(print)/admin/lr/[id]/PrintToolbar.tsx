"use client";

/** Only shown in the no-Chromium fallback (?toolbar=1); hidden when printing. */
export function PrintToolbar({ title }: { title: string }) {
  return (
    <div className="lr-toolbar print:hidden">
      <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          padding: "6px 14px", borderRadius: 6, border: "1px solid #1d4ed8",
          background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer",
        }}
      >
        Print / Save as PDF
      </button>
    </div>
  );
}
