"use client";
/* eslint-disable @next/next/no-img-element */

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@/components/NavigationProgressContext";
import { useUserStore } from "@/store/userStore";
import { Wallet, PlusCircle, List, Settings, Gift, Store } from "lucide-react";
import { getInitial } from "@/lib/initials";
import { walletApi } from "@/services/wallet";
import { queryKeys } from "@/lib/query-keys";
import { formatNaira } from "@/lib/utils";
import type { NavItem, NavSection } from "@/types/common";

// Matches the backend's hourly wallet-low notification cron
// (walletLowBalance.job.js's own LOW_BALANCE_KOBO) and the wallet page's own
// nudge — ₦1,000 exactly does NOT count as low, only ₦999 down to ₦0 does,
// hence the strict `<` everywhere this is compared, never `<=`.
const LOW_BALANCE_KOBO = 100_000; // ₦1,000

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { navigate } = useNavigation();

  return (
    <button
      id={item.id}
      onClick={() => navigate(item.href)}
      className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-dash-body cursor-pointer transition-colors ${
        active ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <span className={active ? "text-white" : "text-gray-500"}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </button>
  );
}

// Desktop-only navigation rail. On mobile the BottomNav is the sole
// navigation surface — there is no drawer.
export default function Sidebar() {
  const pathname = usePathname();
  const { navigate } = useNavigation();
  const userDetails = useUserStore((state) => state.user);

  // Shares the wallet page's query key, so this is served from cache whenever
  // the wallet has been loaded recently.
  const { data: wallet } = useQuery({
    queryKey: queryKeys.wallet.detail,
    queryFn: walletApi.getWallet,
    staleTime: 30_000,
  });

  const sections: NavSection[] = [
    {
      title: "Listings",
      items: [
        {
          label: "Add Listing",
          icon: <PlusCircle size={16} />,
          href: "products/add",
          id: "add-listing-nav",
        },
        {
          label: "View Listings",
          icon: <List size={16} />,
          href: "products/",
          id: "my-listings-nav",
        },
      ],
    },
    {
      title: "Storefront",
      items: [
        {
          label: "My Store",
          icon: <Store size={16} />,
          href: "store",
          id: "store-nav",
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          label: "Wallet",
          icon: <Wallet size={16} />,
          href: "wallet",
          id: "wallet-nav",
        },
        {
          label: "Referrals",
          icon: <Gift size={16} />,
          href: "referrals",
          id: "referrals-nav",
        },
        {
          label: "Settings",
          icon: <Settings size={16} />,
          href: "settings",
          id: "settings-nav",
        },
      ],
    },
  ];

  // Extract user ID from the first segment of the pathname
  const userId = pathname.split("/")[1]; // e.g., "69cc90bae9d771796ecdd3b4"

  // Helper to build an absolute path for the sidebar link
  const getFullPath = (relativePath: string) => {
    const clean = relativePath.replace(/^\//, "").replace(/\/$/, "");
    return `/${userId}/${clean}`;
  };

  // Helper to check if a given relative path matches the current route
  const isNavActive = (relativePath: string) => {
    const segments = pathname.split("/").filter(Boolean);
    const currentRoute = segments.slice(1).join("/");
    const normalized = relativePath.replace(/^\//, "").replace(/\/$/, "");
    return currentRoute === normalized;
  };

  return (
    <aside className="hidden lg:flex w-[260px] h-full bg-white flex-col border-r border-gray-200 overflow-y-auto flex-shrink-0">
      <div className="flex items-center px-4 py-2 h-[70px] border-b border-gray-200">
        <div className="flex gap-1.5 -ml-4">
          <img
            src="https://res.cloudinary.com/dbhpul04t/image/upload/v1779377619/velte_logo_esn5dj_tbfllz.png"
            alt="Velte logo"
            width={100}
            height={20}
          />
        </div>
      </div>

      <nav className="flex-1 flex-col px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-dash-micro font-semibold uppercase text-gray-400 px-3 mb-2 tracking-wider">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  item={{ ...item, href: getFullPath(item.href) }}
                  active={isNavActive(item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Wallet summary — real state, not filler; the rail's second job */}
      <div className="px-3 pb-3">
        <div className="rounded-xl bg-gradient-to-br from-orange-50 to-white border border-orange-100 p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-dash-caption text-gray-500">
              Wallet balance
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wallet?.autoRecharge.enabled &&
                wallet.autoRecharge.hasCardOnFile
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
              title={
                wallet?.autoRecharge.enabled &&
                wallet.autoRecharge.hasCardOnFile
                  ? "Auto-recharge on"
                  : "Auto-recharge off"
              }
            />
          </div>
          <p className="text-lg font-bold text-[#023337]">
            {wallet ? formatNaira(wallet.balanceKobo) : "—"}
          </p>
          {wallet && wallet.balanceKobo < LOW_BALANCE_KOBO && (
            <p className="text-dash-caption text-amber-600 mt-0.5">
              Balance is running low
            </p>
          )}
          <button
            onClick={() => navigate(getFullPath("wallet"))}
            className="mt-2.5 w-full py-1.5 text-dash-caption font-semibold text-orange-600 bg-white border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
          >
            {wallet && wallet.balanceKobo < LOW_BALANCE_KOBO
              ? "Top Up"
              : "Manage Wallet"}
          </button>
        </div>
      </div>

      <div className="px-3 py-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-secondary font-bold flex-shrink-0 overflow-hidden">
            {userDetails?.avatar ? (
              <img
                src={userDetails.avatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              getInitial(userDetails?.company?.name ?? "")
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-dash-body font-semibold text-gray-900 leading-tight">
              {userDetails?.company?.name}
            </p>
            <p className="text-dash-caption text-gray-400 truncate">
              @{userDetails?.username}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
