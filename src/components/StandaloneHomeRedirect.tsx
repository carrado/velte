"use client";

import { useEffect } from "react";
import { useIsStandalone } from "@/hooks/useIsStandalone";

// The manifest's start_url is "/", and every Velte logo Link across the app
// points at "/" too — so the installed PWA keeps landing back on the
// marketing homepage instead of its own app-shell landing screen. Bounce
// standalone visitors straight to /welcome the moment this page mounts.
export default function StandaloneHomeRedirect() {
  const isStandalone = useIsStandalone();

  useEffect(() => {
    if (isStandalone) {
      window.location.replace("/welcome");
    }
  }, [isStandalone]);

  return null;
}
