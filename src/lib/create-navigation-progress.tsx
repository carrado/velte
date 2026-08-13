"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getPrefetchFailureMessage,
  runPrefetchTasks,
} from "@/lib/prefetch-routes";
import type { PrefetchTask } from "@/lib/prefetch-routes";

type NavigationContextValue = { navigate: (href: string) => void };

export interface NavigationProgressConfig {
  /** Maps a target href to whatever key `getPrefetchTasks` reads. */
  getRouteKey: (href: string) => string;
  getPrefetchTasks: (routeKey: string) => PrefetchTask[];
  /** Resolves a (possibly relative/shorthand) href against the current
   *  pathname before it's compared/pushed — the vendor dashboard uses this
   *  to prefix bare segments with the logged-in user's id; other trees can
   *  just return `href` unchanged. */
  normalizeHref: (href: string, pathname: string) => string;
}

/** Factory behind both NavigationProgressContext (vendor dashboard,
 *  /[id]/*) and BuyerNavigationProgressContext (buyer dashboard, /buyer/*)
 *  — same "prefetch the next page's data before pushing, with a real top
 *  progress bar driven by that prefetch's own progress" behavior, just
 *  pointed at each tree's own routes/query keys via `config`. Extracted
 *  here instead of copy-pasting the whole provider a second time, which
 *  would inevitably drift from the original as either tree evolves. */
export function createNavigationProgress(config: NavigationProgressConfig) {
  const NavigationContext = createContext<NavigationContextValue>({
    navigate: () => {},
  });

  function useNavigation() {
    return useContext(NavigationContext);
  }

  function NavigationProgressProvider({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const router = useRouter();
    const pathname = usePathname();
    const queryClient: QueryClient = useQueryClient();

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
        const targetHref = config.normalizeHref(href, pathname);

        if (targetHref === pathname) {
          return;
        }

        const routeKey = config.getRouteKey(targetHref);
        const tasks = config.getPrefetchTasks(routeKey);

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
                "h-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.55)]",
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

  return { NavigationProgressProvider, useNavigation };
}
