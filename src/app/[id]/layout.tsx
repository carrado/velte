"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { categoriesApi } from "@/services/products";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { NavigationProgressProvider } from "@/components/NavigationProgressContext";
import AppInitOverlay from "@/components/AppInitOverlay";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usersApi } from "@/services/users";
import { useUserStore } from "@/store/userStore";
import { useIsFood } from "@/hooks/useBusinessType";
import { useNotificationsSync } from "@/hooks/useNotificationsSync";

// Needs client-only browser APIs (Notification, PushManager) at module init —
// ssr:false keeps it out of the server render entirely.
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
};

function getTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] is the [id] param; everything after is the sub-path
  const subPath = segments.slice(1).join("/");
  if (PATH_TITLES[subPath]) return PATH_TITLES[subPath];
  // Handle dynamic sub-paths: /products/[id]/edit → "Edit Listing"
  if (segments.at(-1) === "edit" && segments.at(-3) === "products")
    return "Edit Listing";
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

  // On the view-listing page (/{userId}/products/{productId}) the generic
  // last-segment fallback would title the header with the raw listing id —
  // resolve the actual listing name instead. Same query key as the page's
  // own fetch, so this reads the cache rather than fetching twice.
  const segments = pathname.split("/").filter(Boolean);
  const viewedListingId =
    segments.length === 3 &&
    segments[1] === "products" &&
    !PATH_TITLES[segments.slice(1).join("/")]
      ? segments[2]
      : undefined;
  const { data: viewedListing } = useQuery({
    queryKey: queryKeys.products.detail(viewedListingId ?? ""),
    queryFn: () => categoriesApi.getProduct(viewedListingId!),
    enabled: Boolean(viewedListingId),
  });
  // Seed from the store so we skip the overlay when the user is already loaded
  // (avoids a synchronous setState in the fetch effect below).
  const [meStatus, setMeStatus] = useState<"loading" | "ready" | "error">(() =>
    useUserStore.getState().user ? "ready" : "loading",
  );
  const mainRef = useRef<HTMLElement>(null);
  const userId = useUserStore((state) => state.user?.id);
  useNotificationsSync(userId);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Fetch current user on mount so the store is populated for the shell.
  // Always refetch (even if login already seeded a user) since that seed can
  // carry stale derived fields like businessType — getMe() is the source of
  // truth. Only fall back to the error overlay if we had nothing cached.
  useEffect(() => {
    const hadUser = !!useUserStore.getState().user;
    usersApi
      .getMe()
      .then(() => setMeStatus("ready"))
      .catch(() => {
        if (!hadUser) setMeStatus("error");
      });
  }, []);

  return (
    <NavigationProgressProvider>
      {meStatus !== "ready" && <AppInitOverlay status={meStatus} />}
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
                  // View-listing page: the listing's own name (never the id).
                  if (viewedListingId) return viewedListing?.name ?? "Listing";
                  const t = getTitle(pathname);
                  if (!isFood) return t;
                  const foodMap: Record<string, string> = {
                    "My Listings": "My Menu",
                    "Add Listing": "Add Dish",
                    "Edit Listing": "Edit Dish",
                  };
                  return foodMap[t] ?? t;
                })()}
              />
              <PushNotificationManager />
              <TooltipProvider>{children}</TooltipProvider>
            </div>
          </main>

          <BottomNav />
        </div>
      </div>
    </NavigationProgressProvider>
  );
}
