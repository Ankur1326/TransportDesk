/**
 * Brand + marketing config for the PUBLIC site (home, features, about,
 * contact, auth pages).
 *
 * This is deliberately separate from `site-config.ts`, which still feeds the
 * printed LR / freight-bill fallbacks inside the dashboard. Nothing here
 * refers to any individual transport company: the product is multi-tenant, and
 * each customer sets its own company name, address and logo in Settings.
 *
 * Rename the product with NEXT_PUBLIC_BRAND_NAME. Contact channels are only
 * shown when their env var is set, so no placeholder numbers ever ship.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "TransportDesk",
  tagline: "Lorry receipts, freight bills and customers — one workspace for your transport business.",
  description:
    "Create lorry receipts (LR/bilty) and GST freight bills, track bookings to delivery, and keep every party and document in one secure workspace built for transport companies.",

  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "",
  whatsapp: (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/[^\d]/g, ""),

  navLinks: [
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],

  footerProduct: [
    { href: "/features", label: "Features" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#faq", label: "FAQ" },
  ],

  footerCompany: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/sign-in", label: "Sign in" },
  ],
} as const;

export const SIGN_UP_HREF = "/sign-up";
export const SIGN_IN_HREF = "/sign-in";

export const hasSupportChannel = Boolean(brand.supportEmail || brand.supportPhone || brand.whatsapp);
