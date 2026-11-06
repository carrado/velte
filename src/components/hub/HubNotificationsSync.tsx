"use client";

import { useNotificationsSync } from "@/hooks/useNotificationsSync";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";

// Seeds the shared notifications store on Hub for either signed-in
// identity — vendors already sync under /[id], buyers under /chat's
// sidebar poll into react-query only. Hub needs the zustand feed for the
// header bell (NotificationDropdown).
export function HubNotificationsSync() {
  const vendorId = useUserStore((state) => state.user?.id);
  const buyerId = useBuyerStore((state) => state.buyer?.id);
  useNotificationsSync(vendorId ?? buyerId);
  return null;
}
