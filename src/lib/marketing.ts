import type { Icon } from "@/components/icons";
import {
  Building2,
  FileCheck2,
  FileText,
  Languages,
  Lock,
  PackageSearch,
  Receipt,
  UserRound,
} from "@/components/icons";

/**
 * Marketing copy lives here so the home page and /features stay in sync.
 * Every item below maps to something the dashboard actually does today —
 * don't add claims (pricing, uptime, customer counts…) that aren't true.
 */

export interface Feature {
  id: string;
  icon: Icon;
  title: string;
  summary: string;
  details: string[];
}

export const features: Feature[] = [
  {
    id: "lorry-receipts",
    icon: FileText,
    title: "Lorry receipts (LR / bilty)",
    summary: "Create a complete LR in one form, with automatic numbering.",
    details: [
      "Consignor, consignee, route, goods, weight and charges in a single guided form",
      "Sequential LR numbers that continue from the number you choose",
      "Edit any LR later without re-entering the details",
    ],
  },
  {
    id: "print-and-share",
    icon: FileCheck2,
    title: "Print-ready formats & PDFs",
    summary: "Pick the LR layout you like and download every copy as a PDF.",
    details: [
      "Choose from several LR formats and preview them before you commit",
      "Separate Lorry, Consignee, Consignor and File copies — or one PDF with all of them",
      "Print straight from the browser or download to share",
    ],
  },
  {
    id: "freight-bills",
    icon: Receipt,
    title: "GST freight bills",
    summary: "Turn delivered consignments into a bill without retyping.",
    details: [
      "Select the consignments to bill and the line items fill themselves in",
      "Your GST number, bank details and UPI QR printed on every bill",
      "Bill numbers are generated for you and previewed before printing",
    ],
  },
  {
    id: "bookings",
    icon: PackageSearch,
    title: "Bookings & delivery status",
    summary: "See every LR by status, from Booked to Delivered.",
    details: [
      "Filter by Booked, On Route, Delivered or Cancelled with live counts",
      "Search by LR number, party or route and act on several LRs at once",
      "Upload proof of delivery against the LR when the goods arrive",
    ],
  },
  {
    id: "parties",
    icon: UserRound,
    title: "Customers & parties",
    summary: "Keep consignors and consignees in one searchable list.",
    details: [
      "Save GSTIN, address and contact details once, reuse them everywhere",
      "Pick a saved party while creating an LR or bill",
      "Add, edit and remove parties any time",
    ],
  },
  {
    id: "your-brand",
    icon: Building2,
    title: "Your company on every document",
    summary: "Your name, logo, signature and terms — not ours.",
    details: [
      "Company logo, address, GST and contact details printed on LRs and bills",
      "Your own terms and conditions for LRs, invoices and quotations",
      "Hindi labels available on the LR form for your team",
    ],
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Private to your company",
    summary: "Each company only ever sees its own data.",
    details: [
      "Sign-in required for everything in the dashboard",
      "Consignments, bills and parties are scoped to your account",
      "Passwords are hashed and never stored in plain text",
    ],
  },
];

export const steps = [
  {
    title: "Create your account",
    description: "Sign up with your email in under a minute — no setup call, no paperwork.",
  },
  {
    title: "Add your company details",
    description: "Enter your name, address, GST number and logo once. They appear on every document.",
  },
  {
    title: "Book, print and bill",
    description: "Create LRs, download PDFs, update delivery status and raise freight bills from the same place.",
  },
];

export const highlights = [
  { icon: FileText, label: "Multiple LR formats" },
  { icon: Languages, label: "Hindi labels on the LR form" },
  { icon: FileCheck2, label: "PDF copies for every party" },
  { icon: Receipt, label: "GST-ready freight bills" },
];

export const faqs = [
  {
    q: "Who is this for?",
    a: "Transport companies, commission agents and small fleet owners who issue lorry receipts and freight bills and want them in one place instead of paper books and spreadsheets.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. It runs in your browser on a phone, tablet or computer. Sign in and you're working.",
  },
  {
    q: "Can I use my own company name and logo?",
    a: "Yes. Add your company name, address, GST number, logo, signature and terms in Settings and they're used on every LR and bill you print.",
  },
  {
    q: "Is my data shared with other companies?",
    a: "No. Each company's consignments, bills and parties are tied to its own account and aren't visible to anyone else.",
  },
  {
    q: "Which LR formats are available?",
    a: "There are several layouts to choose from. You can preview them in Settings and switch whenever you like.",
  },
  {
    q: "How do I get help?",
    a: "Use the details on the Contact page and we'll get back to you.",
  },
];
