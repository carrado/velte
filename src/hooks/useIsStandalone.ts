"use client";

import { useSyncExternalStore } from "react";

// Distinct from useIsInstalled: that flag flips true the moment the browser's
// install prompt is accepted, even though the tab that triggered it is still
// running in ordinary browser chrome (display-mode stays "browser" until the
// user actually opens the app from its home-screen/app-list icon). This hook
// reports only the latter — whether THIS window is currently running as the
// standalone, installed app — so prompts that only make sense inside the
// installed app (e.g. asking for notification permission) don't fire in a
// browser tab right after the install click.
//
// useSyncExternalStore, not useState+useEffect — the third argument
// (getServerSnapshot) is what makes this hydration-safe: React calls it
// (always `false` here) for the server render AND the client's first
// hydration pass, so those two always agree by construction, then re-checks
// getSnapshot() once mounted to pick up the real value. A useState lazy
// initializer reading `window.matchMedia` directly doesn't have this
// guarantee — it returns the REAL value on the client's very first render,
// which is exactly the "server/client branch `typeof window !== 'undefined'`"
// mismatch React's own hydration-warning message names. A manual `setState`
// call inside a plain effect avoids the mismatch too, but trips this
// project's `react-hooks/set-state-in-effect` lint rule (a synchronous
// setState in an effect body causes an avoidable extra render) —
// useSyncExternalStore is the sanctioned way to do both at once.
function getSnapshot(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's home-screen launch, pre-display-mode-media-query support.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

export function useIsStandalone() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
