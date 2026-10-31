import type { LedgerSide, LedgerTypeFilter } from "@/lib/ledger/build-ledger";

/**
 * Wording and colours for the two ledgers. The UI components take a `kind`
 * and read everything from here, so the supplier screen is the customer screen
 * with the direction reversed rather than a copy of it.
 *
 * Tailwind only generates classes it can see as whole strings, so every class
 * below is spelled out in full.
 */
export type PartyKind = "customer" | "supplier";

export interface SideStyle {
  side: LedgerSide;
  /** "Receivable (Debit)" / "Paid (Debit)" ... shown on buttons and the dialog. */
  label: string;
  /** "Receivable" / "Paid". */
  short: string;
  /** Accounting code, always shown next to the colour. */
  code: "Dr" | "Cr";
  text: string;
  soft: string;
  softText: string;
  /** Solid button colour. */
  solid: string;
}

export interface PartyConfig {
  kind: PartyKind;
  singular: string;
  plural: string;
  /** Lower-case singular, for sentences. */
  noun: string;
  apiBase: string;
  /** Page the screen lives on. */
  docWord: string;
  docPlural: string;
  searchPlaceholder: string;
  /** The side that RAISES the balance (receivable / payable). */
  increase: SideStyle;
  /** The side that LOWERS it (received / paid). */
  decrease: SideStyle;
  typeFilters: { key: LedgerTypeFilter; label: string }[];
  /** Where the net balance sits when it is above / below zero. */
  net: {
    positiveCode: "Dr" | "Cr";
    negativeCode: "Dr" | "Cr";
    positiveStatus: string;
    positiveHint: string;
    negativeStatus: string;
    negativeHint: string;
    positiveText: string;
    negativeText: string;
  };
}

export const PARTY_CONFIG: Record<PartyKind, PartyConfig> = {
  customer: {
    kind: "customer",
    singular: "Customer",
    plural: "Customers",
    noun: "customer",
    apiBase: "/api/admin/customer",
    docWord: "Invoice",
    docPlural: "invoices",
    searchPlaceholder: "Bill or LR number",
    increase: {
      side: "receivable",
      label: "Receivable (Debit)",
      short: "Receivable",
      code: "Dr",
      text: "text-(--receivable)",
      soft: "bg-(--receivable-soft)",
      softText: "bg-(--receivable-soft) text-(--receivable)",
      solid: "bg-(--receivable) text-white dark:text-neutral-900",
    },
    decrease: {
      side: "received",
      label: "Received (Credit)",
      short: "Received",
      code: "Cr",
      text: "text-(--received)",
      soft: "bg-(--received-soft)",
      softText: "bg-(--received-soft) text-(--received)",
      solid: "bg-(--received) text-white dark:text-neutral-900",
    },
    typeFilters: [
      { key: "all", label: "All" },
      { key: "receivable", label: "Receivable" },
      { key: "received", label: "Received" },
    ],
    net: {
      positiveCode: "Dr",
      negativeCode: "Cr",
      positiveStatus: "Receivable",
      positiveHint: "customer owes you",
      negativeStatus: "Advance",
      negativeHint: "customer has paid ahead",
      positiveText: "text-(--receivable)",
      negativeText: "text-(--received)",
    },
  },
  supplier: {
    kind: "supplier",
    singular: "Supplier",
    plural: "Suppliers",
    noun: "supplier",
    apiBase: "/api/admin/supplier",
    docWord: "Contract",
    docPlural: "contracts",
    searchPlaceholder: "Contract, vehicle or LR number",
    increase: {
      side: "payable",
      label: "Payable (Credit)",
      short: "Payable",
      code: "Cr",
      text: "text-(--payable)",
      soft: "bg-(--payable-soft)",
      softText: "bg-(--payable-soft) text-(--payable)",
      solid: "bg-(--payable) text-white dark:text-neutral-900",
    },
    decrease: {
      side: "paid",
      label: "Paid (Debit)",
      short: "Paid",
      code: "Dr",
      text: "text-(--paid)",
      soft: "bg-(--paid-soft)",
      softText: "bg-(--paid-soft) text-(--paid)",
      solid: "bg-(--paid) text-white dark:text-neutral-900",
    },
    typeFilters: [
      { key: "all", label: "All" },
      { key: "payable", label: "Payable" },
      { key: "paid", label: "Paid" },
    ],
    net: {
      positiveCode: "Cr",
      negativeCode: "Dr",
      positiveStatus: "Payable",
      positiveHint: "you owe the supplier",
      negativeStatus: "Advance paid",
      negativeHint: "you have paid ahead",
      positiveText: "text-(--payable)",
      negativeText: "text-(--paid)",
    },
  },
};

/** Style of one entry side, whichever ledger it belongs to. */
export function sideStyle(side: LedgerSide): SideStyle {
  for (const cfg of Object.values(PARTY_CONFIG)) {
    if (cfg.increase.side === side) return cfg.increase;
    if (cfg.decrease.side === side) return cfg.decrease;
  }
  return PARTY_CONFIG.customer.increase;
}
