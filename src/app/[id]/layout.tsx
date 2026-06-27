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
import AppInitOverlay from "@/components/AppInitOverlay";

const PushNotificationManager = dynamic(
  () => import("@/components/PushNotificationManager"),
  { ssr: false },
);
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getOrder } from "@/services/orders";
import { checkAISetup } from "@/services/aiSetup";
import { useOnboardingStore } from "@/store/onboardingStore";
import { usersApi } from "@/services/users";
import { transactionService } from "@/services/transactions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNotificationsSync } from "@/hooks/useNotificationsSync";
import { useUserStore } from "@/store/userStore";
import { useIsFood } from "@/hooks/useBusinessType";

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

// Returns the orderId when on the single-order detail route, else null.
// Route shape: /[id]/orders/[orderId]
function getOrderDetailId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 3 && segments[1] === "orders") return segments[2];
  return null;
}

function truncateTitle(name: string, max = 32): string {
  return name.length > max ? `${name.slice(0, max).trimEnd()}…` : name;
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [meStatus, setMeStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const mainRef = useRef<HTMLElement>(null);

  const userId = pathname.split("/")[1];
  useNotificationsSync(userId);

  // On the single-order route the title should be the product name, not the
  // order id. Re-uses the same query key as ViewOrderPage so the fetch dedupes.
  const orderDetailId = getOrderDetailId(pathname);
  const { data: detailOrder } = useQuery({
    queryKey: queryKeys.orders.detail(orderDetailId ?? ""),
    queryFn: () => getOrder(orderDetailId!),
    enabled: !!orderDetailId,
  });

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Fetch current user on mount, then determine which onboarding step to resume.
  // markInitialized() is called on every exit path so the tour never flashes
  // the wrong step while the API calls are in flight.
  useEffect(() => {
    async function init() {
      const store = useOnboardingStore.getState();

      let user = useUserStore.getState().user;
      if (!user) {
        try {
          user = await usersApi.getMe();
          setMeStatus("ready");
        } catch {
          setMeStatus("error");
          store.markInitialized();
          return;
        }
      } else {
        setMeStatus("ready");
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
      setMeStatus("error");
      useOnboardingStore.getState().markInitialized();
    });
  }, []);

  return (
    <NavigationProgressProvider>
      {meStatus !== "ready" && <AppInitOverlay status={meStatus} />}
      <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden">
        <TrialGate />
        <div className="flex flex-1 min-h-0">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main
            ref={mainRef}
            className="flex-1 overflow-y-auto pb-16 sm:pb-0 min-w-0"
          >
            <div className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 md:p-6 space-y-6 text-dash-body antialiased">
              <Header
                title={(() => {
                  if (orderDetailId)
                    return detailOrder?.product?.name
                      ? truncateTitle(detailOrder.product.name)
                      : "Order";
                  const t = getTitle(pathname);
                  if (!isFood) return t;
                  const foodMap: Record<string, string> = {
                    "Product List": "My Menu",
                    "Add Products": "Add Dish",
                    "Edit Product": "Edit Dish",
                  };
                  return foodMap[t] ?? t;
                })()}
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
