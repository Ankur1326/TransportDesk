/** Maps admin routes to header breadcrumb labels. */
export const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/bookings": "Bookings",
  "/admin/consignment/new": "New Consignment",
  "/admin/billings": "All Bills",
  "/admin/billing/new": "Create Bill",
  "/admin/shipments": "Shipments",
  "/admin/vehicles": "Vehicles",
  "/admin/drivers": "Drivers",
  "/admin/customers": "Customers",
  "/admin/payments": "Payments",
  "/admin/quote-requests": "Quote Requests",
  "/admin/content": "Content",
  "/admin/settings": "Settings",
  "/user/profile": "My Profile",
};

export function getAdminPageTitle(pathname: string): string {
  if (ADMIN_PAGE_TITLES[pathname]) return ADMIN_PAGE_TITLES[pathname];

  const match = Object.entries(ADMIN_PAGE_TITLES).find(([route]) =>
    pathname.startsWith(route + "/")
  );
  return match?.[1] ?? "Admin";
}
