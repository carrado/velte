"use client";

import { useSyncExternalStore } from "react";

const WAS_INSTALLED_KEY = "pwa-was-installed";

// Module-level, not component state: the "appinstalled" event fires while
// the tab is still ordinary browser chrome (display-mode stays "browser"
// until the user actually opens the app from its home-screen icon — see
// useIsStandalone's own comment on that distinction), so matchMedia alone
// can't reflect "installed" right after the event. A plain mutable flag the
// snapshot function reads is exactly what useSyncExternalStore expects for
// syncing with this kind of imperative, external event.
let installedViaEvent = false;

// Shared between usePushNotifications (gates the initial nudge) and
// PushNotificationManager's own install-prompt flow — both need to know
// whether the PWA is already installed, independently of each other.
//
// useSyncExternalStore, not useState+useEffect — see useIsStandalone's own
// comment for why: the getServerSnapshot argument (always `false`) is what
// makes the server render and the client's first hydration pass agree by
// construction, and a manual setState in a plain effect would trip this
// project's `react-hooks/set-state-in-effect` lint rule.
function getSnapshot(): boolean {
  return (
    installedViaEvent || window.matchMedia("(display-mode: standalone)").matches
  );
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(onStoreChange: () => void) {
  const onInstalled = () => {
    installedViaEvent = true;
    localStorage.setItem(WAS_INSTALLED_KEY, "1");
    onStoreChange();
  };
  window.addEventListener("appinstalled", onInstalled);
  return () => window.removeEventListener("appinstalled", onInstalled);
}

export function useIsInstalled() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
