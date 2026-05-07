"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { NavigationProgressProvider } from "@/components/NavigationProgressContext";
import AISetupTour from "@/components/AISetupTour";
import { checkAISetup, hasDismissedTourThisSession } from "@/services/aiSetup";

const PATH_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Order Management",
  customers: "Customers",
  transactions: "Transaction",
  "products/add": "Add Products",
  "products/reviews": "Product Reviews",
  products: "Product List",
  "ai-setup": "AI Settings",
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
  const [showTour, setShowTour] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    if (hasDismissedTourThisSession()) return;
    checkAISetup()
      .then(({ isSetup }) => {
        if (!isSetup) setShowTour(true);
      })
      .catch(() => {
        // Status couldn't be confirmed (no setup record yet, transient error,
        // etc.) — default to showing the tour so first-time users get prompted.
        setShowTour(true);
      });
  }, []);

  return (
    <NavigationProgressProvider>
      <div className="flex h-screen bg-[#F1F5F9] overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main ref={mainRef} className="flex-1 overflow-y-auto pb-16 min-w-0">
          <div className="py-4 md:p-6 space-y-6">
            <Header
              title={getTitle(pathname)}
              onMenuClick={() => setSidebarOpen(true)}
            />
            {children}
          </div>
        </main>

        <BottomNav onMenuClick={() => setSidebarOpen(true)} />
      </div>

      {showTour && <AISetupTour onDismiss={() => setShowTour(false)} />}
    </NavigationProgressProvider>
  );
}
