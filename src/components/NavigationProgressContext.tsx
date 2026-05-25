"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTrialStore } from "@/store/trialStore";
import {
  getPrefetchFailureMessage,
  getPrefetchTasks,
  getRouteKey,
  normalizeDashboardHref,
  runPrefetchTasks,
} from "@/lib/prefetch-routes";

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
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const { isMedium, isUrgent } = useTrialStore();
  const darkBar = isMedium || isUrgent;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [completing, setCompleting] = useState(false);

  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navIdRef = useRef(0);

  function clearTimers() {
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }

  const resetProgressBar = useCallback((navId: number) => {
    if (navId !== navIdRef.current) return;
    setVisible(false);
    setCompleting(false);
    setProgress(0);
  }, []);

  const navigate = useCallback(
    async (href: string) => {
      const navId = ++navIdRef.current;
      const targetHref = normalizeDashboardHref(href, pathname);

      if (targetHref === pathname) {
        return;
      }

      const routeKey = getRouteKey(targetHref);
      const tasks = getPrefetchTasks(routeKey);

      clearTimers();
      setCompleting(false);
      setVisible(true);
      setProgress(4);

      try {
        await runPrefetchTasks(queryClient, tasks, (pct) => {
          if (navId !== navIdRef.current) return;
          setProgress(pct);
        });
      } catch (error) {
        if (navId !== navIdRef.current) return;
        toast.error(getPrefetchFailureMessage(error));
        resetProgressBar(navId);
        return;
      }

      if (navId !== navIdRef.current) return;

      setCompleting(true);
      setProgress(100);

      completeTimerRef.current = setTimeout(() => {
        router.push(targetHref);
        hideTimerRef.current = setTimeout(() => {
          resetProgressBar(navId);
        }, 200);
      }, 120);
    },
    [router, pathname, queryClient, resetProgressBar],
  );

  return (
    <NavigationContext.Provider value={{ navigate }}>
      {visible && (
        <div className="fixed top-0 left-0 right-0 z-[200] h-[3px]">
          <div
            className={cn(
              "h-full",
              darkBar
                ? "bg-black shadow-[0_0_6px_rgba(0,0,0,0.55)]"
                : "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.55)]",
              completing
                ? "transition-[width] duration-200 ease-out"
                : "transition-[width] duration-100 ease-out",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {children}
    </NavigationContext.Provider>
  );
}
