"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { NavigationProgressProvider } from "@/components/NavigationProgressContext";
import AppInitOverlay from "@/components/AppInitOverlay";
import OnboardingTour from "@/components/OnboardingTour";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usersApi } from "@/services/users";
import { useUserStore } from "@/store/userStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useIsFood } from "@/hooks/useBusinessType";

const PATH_TITLES: Record<string, string> = {
  "products/add": "Add Products",
  "products/reviews": "Product Reviews",
  products: "Product List",
  settings: "Settings",
  wallet: "Wallet",
  store: "My Store",
};

function getTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] is the [id] param; everything after is the sub-path
  const subPath = segments.slice(1).join("/");
  if (PATH_TITLES[subPath]) return PATH_TITLES[subPath];
  // Handle dynamic sub-paths: /products/[id]/edit → "Edit Product"
  if (segments.at(-1) === "edit" && segments.at(-3) === "products")
    return "Edit Product";
  return segments.at(-1)
    ? segments.at(-1)!.charAt(0).toUpperCase() + segments.at(-1)!.slice(1)
    : "";
}

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFood = useIsFood();
  // Seed from the store so we skip the overlay when the user is already loaded
  // (avoids a synchronous setState in the fetch effect below).
  const [meStatus, setMeStatus] = useState<"loading" | "ready" | "error">(() =>
    useUserStore.getState().user ? "ready" : "loading",
  );
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Fetch current user on mount so the store is populated for the shell.
  useEffect(() => {
    if (useUserStore.getState().user) {
      useOnboardingStore.getState().markInitialized();
      return;
    }
    usersApi
      .getMe()
      .then(() => setMeStatus("ready"))
      .catch(() => setMeStatus("error"))
      .finally(() => useOnboardingStore.getState().markInitialized());
  }, []);

  return (
    <NavigationProgressProvider>
      {meStatus !== "ready" && <AppInitOverlay status={meStatus} />}
      <OnboardingTour />
      <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden">
        <div className="flex flex-1 min-h-0">
          <Sidebar />

          <main
            ref={mainRef}
            className="flex-1 overflow-y-auto pb-16 sm:pb-0 min-w-0"
          >
            <div className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 md:p-6 space-y-6 text-dash-body antialiased">
              <Header
                title={(() => {
                  const t = getTitle(pathname);
                  if (!isFood) return t;
                  const foodMap: Record<string, string> = {
                    "Product List": "My Menu",
                    "Add Products": "Add Dish",
                    "Edit Product": "Edit Dish",
                  };
                  return foodMap[t] ?? t;
                })()}
              />
              <TooltipProvider>{children}</TooltipProvider>
            </div>
          </main>

          <BottomNav />
        </div>
      </div>
    </NavigationProgressProvider>
  );
}
