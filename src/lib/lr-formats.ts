import type { LRFormat } from "@/lib/company-settings";

export interface LRFormatMeta {
  name: string;
  tagline: string;
  description: string;
  /** Short "good for" notes shown on the format card. */
  tags: string[];
  /** Brand colours used for the swatches on the card. */
  swatch: [string, string];
}

export const LR_FORMAT_META: Record<LRFormat, LRFormatMeta> = {
  classic: {
    name: "Classic",
    tagline: "The traditional ruled bilty",
    description: "Balanced three-column header with company, route and segment, navy title bars and an orange highlight. Familiar to drivers, godowns and clerks.",
    tags: ["Everyday use", "Familiar"],
    swatch: ["#16213e", "#ef6711"],
  },
  modern: {
    name: "Modern",
    tagline: "Company-forward, teal accents",
    description: "A full-width company banner with a soft teal tint, clear route and party panels, and colour-coded headings.",
    tags: ["Branding", "Clean"],
    swatch: ["#0f766e", "#ccfbf1"],
  },
  compact: {
    name: "Compact",
    tagline: "Dense, smaller type",
    description: "Tighter spacing and a monospaced feel so long goods descriptions and many charge lines stay on one page.",
    tags: ["Many charges", "One page"],
    swatch: ["#334155", "#e2e8f0"],
  },
  ledger: {
    name: "Ledger",
    tagline: "Formal serif, accounts-book look",
    description: "A centred company heading, serif type and warm brown rules. Suits established firms and formal documents.",
    tags: ["Formal", "Serif"],
    swatch: ["#7c2d12", "#fef3c7"],
  },
  executive: {
    name: "Executive",
    tagline: "Premium navy and gold",
    description: "A deep navy company band with a gold rule, gold highlights and a gold grand-total bar. Makes the bilty look like a quality document.",
    tags: ["Premium", "Corporate"],
    swatch: ["#0b1f3a", "#b8893b"],
  },
  minimal: {
    name: "Minimal",
    tagline: "Quiet, hairline, ink-saving",
    description: "Light grey headings, hairline borders and generous contrast on the numbers that matter. Prints cleanly and uses far less ink.",
    tags: ["Saves ink", "Light"],
    swatch: ["#0f172a", "#e2e8f0"],
  },
  bold: {
    name: "Bold",
    tagline: "High contrast, survives photocopies",
    description: "Heavy black rules, a yellow company band and black title bars. Stays readable on carbon copies, dot-matrix output and faint scans.",
    tags: ["Carbon copy", "High contrast"],
    swatch: ["#000000", "#facc15"],
  },
};
