// components/BottomNav.tsx
"use client";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/NavigationProgressContext";
import {
  badgeLabel,
  usePendingBuyerRequests,
} from "@/hooks/usePendingBuyerRequests";
import {
  LayoutGridIcon,
  MessageSquareIcon,
  PlusCircleIcon,
  SettingsIcon,
  StoreIcon,
  WalletIcon,
} from "@/components/icons/hero";
export default function BottomNav() {
  const pathname = usePathname();
  const { navigate } = useNavigation();
  // Requests matched to this vendor that they haven't accepted or declined.
  const pendingRequests = usePendingBuyerRequests();

  const segments = pathname.split("/").filter(Boolean);
  const userId = segments[0];
  const subPath = segments.slice(1).join("/");

  const items = [
    {
      label: "Listings",
      icon: <LayoutGridIcon size={20} />,
      segment: "products",
      // "Add" owns the products/add route, so keep this tab off there.
      active: subPath.startsWith("products") && subPath !== "products/add",
      id: "my-listings-mobile",
    },
    {
      label: "Add",
      icon: <PlusCircleIcon size={20} />,
      segment: "products/add",
      active: subPath === "products/add",
      id: "add-listing-mobile",
    },
    {
      label: "Wallet",
      icon: <WalletIcon size={20} />,
      segment: "wallet",
      active: subPath.startsWith("wallet"),
      id: "wallet-mobile",
    },
    {
      label: "Store",
      icon: <StoreIcon size={20} />,
      segment: "store",
      active: subPath.startsWith("store"),
      id: "store-mobile",
    },
    {
      // Short label, not "Buyer Requests" — six tabs in this row already
      // tightens things up (see the sidebar's own comment: mobile has no
      // drawer, this is the vendor's only nav surface), matches the buyer
      // side's own nav using "Requests" too.
      label: "Requests",
      icon: <MessageSquareIcon size={20} />,
      segment: "buyer-requests",
      active: subPath.startsWith("buyer-requests"),
      id: "buyer-requests-mobile",
      badge: pendingRequests,
    },
    {
      label: "Settings",
      icon: <SettingsIcon size={20} />,
      segment: "settings",
      active: subPath.startsWith("settings"),
      id: "settings-mobile",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200 shadow-lg z-10 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center px-2 py-2">
        {items.map((item) => (
          <button
            key={item.label}
            id={item.id}
            onClick={() => navigate(`/${userId}/${item.segment}`)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
              item.active ? "text-orange-500" : "text-gray-500"
            }`}
          >
            {/* The bubble sits on the icon's top-right corner, ringed in
                the bar's own surface colour so it reads as a separate dot. */}
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
