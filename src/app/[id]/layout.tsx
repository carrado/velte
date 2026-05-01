"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

const PATH_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Order Management",
  customers: "Customers",
  transactions: "Transaction",
  "products/add": "Add Products",
  "products/reviews": "Product Reviews",
  products: "Product List",
};

function getTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] is the [id] param; everything after is the sub-path
  const subPath = segments.slice(1).join("/");
  return (
    PATH_TITLES[subPath] ??
    (segments.at(-1)
      ? segments.at(-1)!.charAt(0).toUpperCase() + segments.at(-1)!.slice(1)
      : "")
  );
}

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto pb-16 min-w-0">
        <div className="p-4 md:p-6 space-y-6">
          <Header
            title={getTitle(pathname)}
            onMenuClick={() => setSidebarOpen(true)}
          />
          {children}
        </div>
      </main>

      <BottomNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
}
