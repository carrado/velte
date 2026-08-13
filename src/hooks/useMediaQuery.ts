"use client";

import { useCallback, useSyncExternalStore } from "react";

// useSyncExternalStore, not useState+useEffect — same reasoning as
// useIsInstalled/useIsStandalone: getServerSnapshot always returning `false`
// is what makes the server render and the client's first hydration pass
// agree by construction, and a manual setState in a plain effect would trip
// this project's `react-hooks/set-state-in-effect` lint rule.
function getServerSnapshot() {
  return false;
}

/** True once `query` matches (e.g. `useMediaQuery("(min-width: 640px)")` to
 *  mirror Tailwind's `sm:` breakpoint) — for picking between two genuinely
 *  different behaviors/animations at a breakpoint, not for layout (Tailwind
 *  responsive classes already handle that without a JS round-trip). Always
 *  `false` on the server and on first client render, matching Tailwind's own
 *  mobile-first default until the real viewport is known. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
