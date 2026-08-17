"use client";

import {
  List,
  Wallet,
  MessageSquare,
  Store,
  ClipboardList,
  UserRound,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useBuyerSession } from "@/hooks/useBuyerSession";

export interface ChatNavItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

// Shared between ChatSidebar (desktop) and ChatMobileDrawer (mobile) so the
// two nav surfaces never drift out of sync — same items, just rendered in
// two different chrome shapes. `null` means neither a vendor nor a buyer
// session exists; both callers render nothing in that case, same as
// ChatHeader's own hasIdentity check.
//
// Vendor wins over buyer when (in principle) both existed — separate auth
// systems, shouldn't happen in practice, but matches the precedence the
// rest of the app already gives vendor auth. Vendor items route OUT to the
// real vendor dashboard (a different route tree entirely, `/[id]/*`) —
// plain hrefs are enough, Next handles the transition like any other link.
export function useChatNavItems(): ChatNavItem[] | null {
  const userDetails = useUserStore((state) => state.user);
  const { buyer } = useBuyerSession();

  if (userDetails) {
    const base = `/${userDetails.id}`;
    return [
      { label: "Listings", icon: List, href: `${base}/products` },
      { label: "Wallet", icon: Wallet, href: `${base}/wallet` },
      {
        label: "Buyer's request",
        icon: MessageSquare,
        href: `${base}/buyer-requests`,
      },
      { label: "Store", icon: Store, href: `${base}/store` },
    ];
  }

  if (buyer) {
    return [
      { label: "Requests", icon: ClipboardList, href: "/chat/requests" },
      { label: "Profile", icon: UserRound, href: "/chat/profile" },
      { label: "Marketplace", icon: Compass, href: "/marketplace" },
    ];
  }

  return null;
}
