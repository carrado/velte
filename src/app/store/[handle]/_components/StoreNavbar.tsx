"use client";

import { useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import { HubHeader } from "@/components/hub/HubHeader";
import { NavigationProgressProvider } from "@/components/hub/HubNavigationProgressContext";
import { CartDrawerHost } from "@/components/cart/CartDrawer";
import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";
import { isSessionSettled, syncSession } from "@/lib/sessionSync";
import type { User } from "@/types/user";
import type { Buyer } from "@/types/buyer";

export default function StoreNavbar({
  initialVendor,
  initialBuyer,
}: {
  initialVendor?: User | null;
  initialBuyer?: Buyer | null;
}) {
  const storeVendor = useUserStore((s) => s.user);
  const storeBuyer = useBuyerStore((s) => s.buyer);

  // Sync initial server-fetched session into client Zustand stores immediately
  useEffect(() => {
    if (initialVendor && !useUserStore.getState().user) {
      useUserStore.getState().setUser(initialVendor);
    }
    if (initialBuyer && !useBuyerStore.getState().buyer) {
      useBuyerStore.getState().setBuyer(initialBuyer);
    }
    if (!initialVendor && !initialBuyer && !isSessionSettled()) {
      void syncSession();
    }
  }, [initialVendor, initialBuyer]);

  const vendor = storeVendor ?? initialVendor ?? null;
  const buyer = storeBuyer ?? initialBuyer ?? null;
  const isLoggedIn = Boolean(vendor || buyer);

  // If user is logged in (vendor or buyer), render the exact standard header design used in Hub & other logged-in areas
  if (isLoggedIn) {
    return (
      <NavigationProgressProvider>
        <HubHeader />
        <CartDrawerHost />
      </NavigationProgressProvider>
    );
  }

  // Otherwise, render the canonical public storefront header
  return (
    <>
      <Navbar forceOpaque />
      <div className="h-16" />
      <CartDrawerHost />
    </>
  );
}
