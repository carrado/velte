"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  fetchDashboardStats,
  fetchWeeklyReport,
  fetchUsersActivity,
  fetchSalesByMonths,
  fetchTransactions,
  fetchTopProducts,
  fetchBestSelling,
  fetchAddableProducts,
} from "@/services/dashboard";
import { fetchOrders, fetchOrderStats } from "@/services/orders";

type RoutePrefetcher = (qc: QueryClient) => Promise<void>;

const ROUTE_PREFETCHES: Record<string, RoutePrefetcher> = {
  dashboard: (qc) =>
    Promise.all([
      qc.prefetchQuery({
        queryKey: ["dashboardStats"],
        queryFn: fetchDashboardStats,
      }),
      qc.prefetchQuery({
        queryKey: ["bestSelling"],
        queryFn: fetchBestSelling,
      }),
      qc.prefetchQuery({
        queryKey: ["monthlySales"],
        queryFn: fetchSalesByMonths,
      }),
      qc.prefetchQuery({
        queryKey: ["topProducts"],
        queryFn: fetchTopProducts,
      }),
      qc.prefetchQuery({
        queryKey: ["transactions"],
        queryFn: fetchTransactions,
      }),
      qc.prefetchQuery({
        queryKey: ["usersActivity"],
        queryFn: fetchUsersActivity,
      }),
      qc.prefetchQuery({
        queryKey: ["weeklyReport", "this_week"],
        queryFn: () => fetchWeeklyReport("this_week"),
      }),
      qc.prefetchQuery({
        queryKey: ["addableProducts"],
        queryFn: fetchAddableProducts,
      }),
    ]).then(() => {}),

  orders: (qc) =>
    Promise.all([
      qc.prefetchQuery({
        queryKey: ["orders", "all"],
        queryFn: () => fetchOrders("all"),
      }),
      qc.prefetchQuery({
        queryKey: ["orderStats"],
        queryFn: fetchOrderStats,
      }),
    ]).then(() => {}),
};

const MIN_DISPLAY_MS = 400;

type NavigationContextValue = { navigate: (href: string) => void };

const NavigationContext = createContext<NavigationContextValue>({
  navigate: () => {},
});

export function useNavigation() {
  return useContext(NavigationContext);
}

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [completing, setCompleting] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navIdRef = useRef(0);

  function clearTimers() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }

  const navigate = useCallback(
    async (href: string) => {
      const navId = ++navIdRef.current;

      clearTimers();
      setCompleting(false);
      setVisible(true);
      setProgress(12);

      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 72) {
            clearInterval(intervalRef.current!);
            return 72;
          }
          return prev + (72 - prev) * 0.12;
        });
      }, 120);

      const segments = href.split("/").filter(Boolean);
      const routeKey = segments[1] ?? "";
      const prefetcher = ROUTE_PREFETCHES[routeKey];

      await Promise.all([
        prefetcher ? prefetcher(queryClient) : Promise.resolve(),
        new Promise<void>((resolve) => setTimeout(resolve, MIN_DISPLAY_MS)),
      ]);

      if (navId !== navIdRef.current) return;

      clearTimers();
      setCompleting(true);
      setProgress(100);

      completeTimerRef.current = setTimeout(() => {
        router.push(href);
        hideTimerRef.current = setTimeout(() => {
          if (navId !== navIdRef.current) return;
          setVisible(false);
          setCompleting(false);
          setProgress(0);
        }, 200);
      }, 280);
    },
    [router, queryClient],
  );

  return (
    <NavigationContext.Provider value={{ navigate }}>
      {visible && (
        <div className="fixed top-0 left-0 right-0 z-[200] h-[3px]">
          <div
            className={cn(
              "h-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.55)]",
              completing
                ? "transition-[width] duration-300 ease-out"
                : "transition-[width] duration-150 ease-linear",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {children}
    </NavigationContext.Provider>
  );
}
