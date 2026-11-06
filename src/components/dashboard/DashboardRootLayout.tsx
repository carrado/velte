"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { categoriesApi } from "@/services/products";
import { HubHeader } from "@/components/hub/HubHeader";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { NavigationProgressProvider } from "@/components/hub/HubNavigationProgressContext";
import { CreditsModalProvider } from "@/components/credits/CreditsModal";
import { IdentitySessionSync } from "@/components/chat/IdentitySessionSync";
import { HubNotificationsSync } from "@/components/hub/HubNotificationsSync";
import AppInitOverlay from "@/components/AppInitOverlay";
import OnboardingTour from "@/components/OnboardingTour";
import PayoutSetupModal from "@/components/payouts/PayoutSetupModal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usersApi } from "@/services/users";
import { ApiError } from "@/lib/api-client";
import { useUserStore } from "@/store/userStore";
import { useNotificationsSync } from "@/hooks/useNotificationsSync";

const PushNotificationManager = dynamic(
  () => import("@/components/PushNotificationManager"),
  { ssr: false },
);

const PATH_TITLES: Record<string, string> = {
  "products/add": "Add Listing",
  "products/reviews": "Reviews",
  products: "My Listings",
  settings: "Settings",
  wallet: "Wallet",
  reports: "Reports",
  orders: "Orders",
  hub: "Vendor Hub",
  "buyer-requests": "Buyer Requests",
  store: "My Store",
  referrals: "Referrals",
  notifications: "Notifications",
};

function getTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "My Listings";
  const subPath = segments.join("/");
  if (PATH_TITLES[subPath]) return PATH_TITLES[subPath];
  if (segments.length === 2 && segments[0] === "buyer-requests")
    return "Buyer's Request";
  if (segments.at(-1) === "edit" && segments.at(-2) === "products")
    return "Edit Listing";
  return (
    PATH_TITLES[segments[0]] ||
    segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
  );
}

export default function DashboardRootLayout({
  children,
  pageTitle,
}: {
  children: React.ReactNode;
  pageTitle?: string;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const viewedListingId =
    segments.length === 2 &&
    segments[0] === "products" &&
    !PATH_TITLES[segments.join("/")]
      ? segments[1]
      : undefined;

  const { data: viewedListing } = useQuery({
    queryKey: queryKeys.products.detail(viewedListingId ?? ""),
    queryFn: () => categoriesApi.getProduct(viewedListingId!),
    enabled: Boolean(viewedListingId),
  });

  const [meStatus, setMeStatus] = useState<
    "loading" | "ready" | "error-network" | "error-server"
  >(() => (useUserStore.getState().user ? "ready" : "loading"));
  const mainRef = useRef<HTMLElement>(null);
  const userId = useUserStore((state) => state.user?.id);
  useNotificationsSync(userId);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    usersApi
      .getMe()
      .then(() => setMeStatus("ready"))
      .catch((err) => {
        if (useUserStore.getState().user) {
          setMeStatus("ready");
          return;
        }
        setMeStatus(
          err instanceof ApiError && err.status === 0
            ? "error-network"
            : "error-server",
        );
      });
  }, []);

  const title =
    pageTitle ??
    (viewedListingId ? (viewedListing?.name ?? "Listing") : getTitle(pathname));

  return (
    <CreditsModalProvider>
      <NavigationProgressProvider>
        <IdentitySessionSync />
        <HubNotificationsSync />
        {meStatus !== "ready" && <AppInitOverlay status={meStatus} />}
        <div className="flex flex-col h-screen bg-canvas overflow-hidden">
          <HubHeader />

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <Sidebar />

            <main
              ref={mainRef}
              className="flex-1 overflow-y-auto pb-16 sm:pb-0 min-w-0"
            >
              <div className="p-4 sm:p-6 space-y-6 text-dash-body antialiased">
                {title && (
                  <div className="flex lg:hidden items-center justify-between pb-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink truncate">
                      {title}
                    </h1>
                  </div>
                )}
                <PushNotificationManager />
                <TooltipProvider>{children}</TooltipProvider>
              </div>
            </main>

            <BottomNav />
          </div>
        </div>
        <OnboardingTour />
        {meStatus === "ready" && <PayoutSetupModal />}
      </NavigationProgressProvider>
    </CreditsModalProvider>
  );
}
