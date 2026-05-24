"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { NavigationProgressProvider } from "@/components/NavigationProgressContext";
import OnboardingTour from "@/components/OnboardingTour";
import TrialGate from "@/components/TrialGate";

const PushNotificationManager = dynamic(
  () => import("@/components/PushNotificationManager"),
  { ssr: false },
);
import { checkAISetup } from "@/services/aiSetup";
import { useOnboardingStore } from "@/store/onboardingStore";
import { usersApi } from "@/services/users";
import { transactionService } from "@/services/transactions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNotificationSeeder } from "@/hooks/useNotificationSeeder";
import { useUserStore } from "@/store/userStore";

const PATH_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Order Management",
  customers: "Customers",
  transactions: "Transaction",
  "products/add": "Add Products",
  "products/reviews": "Product Reviews",
  products: "Product List",
  "ai-setup": "AI Settings",
  search: "Search",
  notifications: "Notifications",
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
  const mainRef = useRef<HTMLElement>(null);

  const userId = pathname.split("/")[1];
  useNotificationSeeder(userId);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Fetch current user on mount, then determine which onboarding step to resume.
  // markInitialized() is called on every exit path so the tour never flashes
  // the wrong step while the API calls are in flight.
  useEffect(() => {
    async function init() {
      const store = useOnboardingStore.getState();

      // Fast path: if the persisted store already has the user, skip the getMe()
      // round-trip — the onboarding field is kept in sync by updateOnboarding().
      // Only fetch from the server on first load (no persisted user).
      let user = useUserStore.getState().user;
      console.log(useUserStore.getState());
      if (!user) {
        try {
          user = await usersApi.getMe();
        } catch {
          store.markInitialized();
          return;
        }
      }

      if (!user?.onboarding) {
        store.markInitialized();
        return;
      }

      const [paymentLinkResult, aiSetupResult] = await Promise.allSettled([
        transactionService.getPaymentLink(),
        checkAISetup(),
      ]);
      const hasPaymentLink =
        paymentLinkResult.status === "fulfilled" && !!paymentLinkResult.value;
      const hasAISetup =
        aiSetupResult.status === "fulfilled" && aiSetupResult.value.isSetup;

      if (hasAISetup) {
        store.skipToStep(3);
      } else if (hasPaymentLink) {
        store.skipToStep(2);
      }
      store.markInitialized();
    }

    init().catch(() => {
      useOnboardingStore.getState().markInitialized();
    });
  }, []);

  return (
    <NavigationProgressProvider>
      <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden">
        <TrialGate />
        <div className="flex flex-1 min-h-0">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main
            ref={mainRef}
            className="flex-1 overflow-y-auto pb-16 sm:pb-0 min-w-0"
          >
            <div className="py-4 md:p-6 space-y-6 text-dash-body antialiased">
              <Header
                title={getTitle(pathname)}
                onMenuClick={() => setSidebarOpen(true)}
              />
              <PushNotificationManager />
              <TooltipProvider>{children}</TooltipProvider>
            </div>
          </main>

          <BottomNav onMenuClick={() => setSidebarOpen(true)} />
        </div>
      </div>

      <OnboardingTour />
    </NavigationProgressProvider>
  );
}
