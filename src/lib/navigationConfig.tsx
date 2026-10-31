import React from "react";
import {
  LuFilePlus2,
  LuLayoutDashboard,
  LuReceiptText,
  LuSettings,
  LuSend,
  LuUsersRound,
  Truck,
} from "@/components/icons";

// A single sidebar menu item
export interface NavItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route: string;
  childItems?: NavItem[];
}

// A group of related menu items
export interface NavigationSection {
  name: string;
  items: NavItem[];
}

// Navigation configuration
export interface NavigationConfig {
  sections: NavigationSection[];
}

// Admin sidebar navigation
export const NAVIGATION_CONFIG: Record<string, NavigationConfig> = {
  transporter: {
    sections: [
      // ─────────────────────────────────────────
      // General
      // ─────────────────────────────────────────
      {
        name: "",
        items: [
          {
            id: "dashboard",
            title: "Dashboard",
            icon: <LuLayoutDashboard className="h-[18px] w-[18px]" />,
            route: "/admin/dashboard",
          },
        ],
      },

      // ─────────────────────────────────────────
      // Operations
      // ─────────────────────────────────────────
      {
        name: "Operations",
        items: [
          {
            id: "bilties",
            title: "Bilties",
            icon: <LuReceiptText className="h-[18px] w-[18px]" />,
            route: "/admin/bookings",
            childItems: [
              {
                id: "all-bilties",
                title: "List All Bilties",
                icon: <LuReceiptText className="h-4 w-4" />,
                route: "/admin/bookings",
              },
              {
                id: "create-bilty",
                title: "Create Bilty",
                icon: <LuFilePlus2 className="h-4 w-4" />,
                route: "/admin/consignment/new",
              },
            ],
          },
          {
            id: "bills",
            title: "Bills",
            icon: <LuReceiptText className="h-[18px] w-[18px]" />,
            route: "/admin/billings",
            childItems: [
              {
                id: "all-bills",
                title: "List All Bills",
                icon: <LuReceiptText className="h-4 w-4" />,
                route: "/admin/billings",
              },
              {
                id: "create-bill",
                title: "Create Bill",
                icon: <LuFilePlus2 className="h-4 w-4" />,
                route: "/admin/billing/new",
              },
            ],
          },
          {
            id: "truck-hiring",
            title: "Truck Hiring",
            icon: <Truck className="h-[18px] w-[18px]" />,
            route: "/admin/lorry-hires",
            childItems: [
              {
                id: "all-lorry-hires",
                title: "List Contracts",
                icon: <LuReceiptText className="h-4 w-4" />,
                route: "/admin/lorry-hires",
              },
              {
                id: "create-lorry-hire",
                title: "New Contract",
                icon: <LuFilePlus2 className="h-4 w-4" />,
                route: "/admin/lorry-hires/new",
              },
            ],
          },
        ],
      },

      // ─────────────────────────────────────────
      // Parties
      // ─────────────────────────────────────────
      {
        name: "Customers",
        items: [
          {
            id: "customers",
            title: "customers",
            icon: <LuSend className="h-[18px] w-[18px]" />,
            route: "/admin/customers",
          },
          {
            id: "suppliers",
            title: "suppliers",
            icon: <Truck className="h-[18px] w-[18px]" />,
            route: "/admin/suppliers",
          },
        ],
      },

      // ─────────────────────────────────────────
      // Fleet & reports
      // ─────────────────────────────────────────
      {
        name: "Fleet",
        items: [
          {
            id: "vehicles",
            title: "vehicles",
            icon: <Truck className="h-[18px] w-[18px]" />,
            route: "/admin/vehicles",
          },
          {
            id: "drivers",
            title: "drivers",
            icon: <LuUsersRound className="h-[18px] w-[18px]" />,
            route: "/admin/drivers",
          },
          {
            id: "trip-profit",
            title: "trip profit",
            icon: <LuReceiptText className="h-[18px] w-[18px]" />,
            route: "/admin/reports/trip-profit",
          },
        ],
      },

      // ─────────────────────────────────────────
      // Account
      // ─────────────────────────────────────────
      {
        name: "Account",
        items: [
          {
            id: "company-settings",
            title: "Company Settings",
            icon: <LuSettings className="h-[18px] w-[18px]" />,
            route: "/admin/settings",
          },
        ],
      },
    ],
  },
};
