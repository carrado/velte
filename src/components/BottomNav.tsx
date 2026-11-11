"use client";

import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import {
  badgeLabel,
  usePendingBuyerRequests,
} from "@/hooks/usePendingBuyerRequests";
import { useUserStore } from "@/store/userStore";
import {
  LayoutGridIcon,
  MessageSquareIcon,
  PlusCircleIcon,
  TruckIcon,
  WalletIcon,
} from "@/components/icons/hero";

export default function BottomNav() {
  const pathname = usePathname();
  const { navigate } = useNavigation();
  const pendingRequests = usePendingBuyerRequests();
  const user = useUserStore((s) => s.user);

  if (!user) return null;

  const items = [
    {
      label: "Listings",
      icon: <LayoutGridIcon size={20} />,
      segment: "products",
      active:
        (pathname === "/" || pathname.startsWith("/products")) &&
        pathname !== "/products/add",
      id: "my-listings-mobile",
    },
    {
      label: "Add",
      icon: <PlusCircleIcon size={20} />,
      segment: "products/add",
      active: pathname === "/products/add",
      id: "add-listing-mobile",
    },
    {
      label: "Wallet",
      icon: <WalletIcon size={20} />,
      segment: "wallet",
      active: pathname.startsWith("/wallet"),
      id: "wallet-mobile",
    },
    {
      label: "Requests",
      icon: <MessageSquareIcon size={20} />,
      segment: "buyer-requests",
      active: pathname.startsWith("/buyer-requests"),
      id: "buyer-requests-mobile",
      badge: pendingRequests,
    },
    {
      label: "Orders",
      icon: <TruckIcon size={20} />,
      segment: "orders",
      active: pathname.startsWith("/orders"),
      id: "orders-mobile",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface/95 dark:bg-surface/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 shadow-lg z-30 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center px-2 py-2">
        {items.map((item) => (
          <button
            key={item.label}
            id={item.id}
            type="button"
            onClick={() => navigate(`/${item.segment}`)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
              item.active
                ? "text-orange-500 font-semibold"
                : "text-gray-500 dark:text-ink/60"
            }`}
          >
            <span className="relative">
              {item.icon}
              {"badge" in item && item.badge ? (
                <span
                  aria-label={`${item.badge} waiting`}
                  className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-orange-500 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ring-surface"
                >
                  {badgeLabel(item.badge)}
                </span>
              ) : null}
            </span>
            <span className="text-dash-caption font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
