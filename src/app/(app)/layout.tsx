// app/(authenticated)/layout.tsx
"use client";
import { useState } from "react";
import { Menu } from "@/components/icons";
import Sidebar from "@/components/admin/Sidebar";
import 'react-loading-skeleton/dist/skeleton.css';
import 'nprogress/nprogress.css';
import '../globals.css';
import { useSession } from "next-auth/react";

type UserRole = 'transporter';

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const userRole: UserRole = 'transporter';

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-brand-950 print:block">
      {session?.user ? (
        <div className="print:hidden">
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            userRole={userRole}
            onNavigate={() => setSidebarOpen(false)}
          />
        </div>
      ) : null}

      <div className="flex-1 transition-all duration-300 md:pl-64 print:pl-0">
        <main className="min-h-screen px-3 py-3 pt-3 transition-all duration-300 print:pt-0">
          {session?.user && (
            <div className="mb-3 flex justify-end md:hidden print:hidden">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Open navigation menu"
                aria-expanded={isSidebarOpen}
                aria-controls="main-sidebar"
                className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-brand-800 shadow-sm hover:bg-neutral-50 dark:border-brand-800 dark:bg-brand-900 dark:text-brand-100 dark:hover:bg-brand-800"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
                Menu
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-brand-950/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RootLayoutContent>{children}</RootLayoutContent>;
}
