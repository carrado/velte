"use client";

import { useEffect, useState } from "react";

// Distinct from useIsInstalled: that flag flips true the moment the browser's
// install prompt is accepted, even though the tab that triggered it is still
// running in ordinary browser chrome (display-mode stays "browser" until the
// user actually opens the app from its home-screen/app-list icon). This hook
// reports only the latter — whether THIS window is currently running as the
// standalone, installed app — so prompts that only make sense inside the
// installed app (e.g. asking for notification permission) don't fire in a
// browser tab right after the install click.
export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari's home-screen launch, pre-display-mode-media-query support.
        (window.navigator as Navigator & { standalone?: boolean })
          .standalone === true),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(display-mode: standalone)");
    const onChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isStandalone;
}
