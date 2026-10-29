"use client";

/**
 * Print bar for the bare print sheets (LR, freight bill). Only shown in the
 * no-Chromium fallback (?toolbar=1); hidden when printing. Self-styled so it
 * works on sheets that don't load the LR stylesheet.
 */
export function PrintToolbar({ title }: { title: string }) {
  return (
    <div
      className="print:hidden"
      style={{
        position: "sticky", top: 0, zIndex: 100, minHeight: 60, padding: "10px 20px",
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10,
        background: "#fff", borderBottom: "1px solid #d1d5db",
      }}
    >
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
