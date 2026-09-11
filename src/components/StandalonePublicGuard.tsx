"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useIsStandalone } from "@/hooks/useIsStandalone";
import { isBlockedInStandalone } from "@/lib/standalonePublicRoutes";

// Keeps the installed PWA out of the marketing site (2026-08-29).
//
// Replaces StandaloneHomeRedirect, which did the same thing for "/" alone and
// was mounted on the homepage only — so every other public page (/faq,
// /pricing, /about…) stayed reachable inside the app, usually one footer link
// away. This is mounted once in the root layout and covers all of them; see
// lib/standalonePublicRoutes.ts for which, and why scope/middleware can't do
// this job.
//
// The pre-paint script in the root layout is what actually prevents the
// flash — it runs synchronously during HTML parsing, before React exists.
// This component is the backstop for CLIENT-SIDE navigation, where no HTML is
// parsed at all and that script never runs again: a <Link> to /faq from
// inside the app is caught here instead.
export function StandalonePublicGuard() {
  const isStandalone = useIsStandalone();
  const pathname = usePathname();

  useEffect(() => {
    if (!isStandalone) return;
    if (!isBlockedInStandalone(pathname)) return;
    // replace(), not assign — the blocked page must not be left one
    // back-press away, which would bounce the person straight back into it.
    window.location.replace("/welcome");
  }, [isStandalone, pathname]);

  return null;
}
