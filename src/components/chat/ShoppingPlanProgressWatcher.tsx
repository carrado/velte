"use client";

import { useEffect } from "react";

import { startShoppingPlanProgressPolling } from "@/store/shoppingPlanProgressStore";

// Kicks off the cross-route progress poll (2026-09-10) — see that store's
// own top comment for why this has to live at the /chat layout level rather
// than inside SearchHome. Renders nothing, same "silent mount-time sync"
// shape as VendorSessionSync right next to it in chat/layout.tsx.
export function ShoppingPlanProgressWatcher() {
  useEffect(() => {
    startShoppingPlanProgressPolling();
  }, []);
  return null;
}
