"use client";
/* eslint-disable @next/next/no-img-element */

import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import { useUserStore } from "@/store/userStore";
import { getInitial } from "@/lib/initials";
import { CreditCardIcon, FeedIcon } from "@/components/icons";
import {
  EnterpriseAvatarBadge,
  EnterpriseBadge,
  isEnterpriseVendor,
} from "@/components/EnterpriseBadge";
import {
  badgeLabel,
  usePendingBuyerRequests,
} from "@/hooks/usePendingBuyerRequests";
import type { NavItem, NavSection } from "@/types/common";
import {
  GiftIcon,
  ListIcon,
  MessageSquareIcon,
  PlusCircleIcon,
  SettingsIcon,
  StoreIcon,
  WalletIcon,
  TruckIcon,
} from "@/components/icons/hero";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { navigate } = useNavigation();

  return (
    <button
      id={item.id}
      type="button"
      onClick={() => navigate(item.href)}
      className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-dash-body cursor-pointer transition-colors ${
        active
          ? "bg-orange-500 text-white font-semibold"
          : "text-gray-600 dark:text-ink/75 hover:bg-gray-100 dark:hover:bg-white/5"
      }`}
    >
      <span
        className={active ? "text-white" : "text-gray-500 dark:text-ink/60"}
      >
        {item.icon}
      </span>
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge ? (
        <span
          aria-label={`${item.badge} waiting`}
          className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-none ${
            active ? "bg-white text-orange-600" : "bg-orange-500 text-white"
          }`}
        >
          {badgeLabel(item.badge)}
        </span>
      ) : null}
    </button>
  );
}

// Desktop-only navigation rail. Sits below the unified HubHeader.
export default function Sidebar() {
  const pathname = usePathname();
  const userDetails = useUserStore((state) => state.user);
  const pendingRequests = usePendingBuyerRequests();
  const isEnterprise = isEnterpriseVendor(userDetails);

  const sections: NavSection[] = [
    {
      title: "Listings",
      items: [
        {
          label: "Add Listing",
          icon: <PlusCircleIcon size={16} />,
          href: "products/add",
          id: "add-listing-nav",
        },
        {
          label: "View Listings",
          icon: <ListIcon size={16} />,
          href: "products",
          id: "my-listings-nav",
        },
      ],
    },
    {
      title: "Storefront",
      items: [
        {
          label: "My Store",
          icon: <StoreIcon size={16} />,
          href: "store",
          id: "store-nav",
        },
        {
          label: "Vendors Hub",
          icon: <FeedIcon size={16} />,
          href: "hub",
          id: "hub-nav",
        },
        {
          label: "Buyer Requests",
          icon: <MessageSquareIcon size={16} />,
          href: "buyer-requests",
          id: "buyer-requests-nav",
          badge: pendingRequests,
        },
        {
          label: "Orders",
          icon: <TruckIcon size={16} />,
          href: "orders",
          id: "orders-nav",
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          label: "Billing",
          icon: <CreditCardIcon size={16} />,
          href: "pricing",
          id: "billing-nav",
        },
        {
          label: "Wallet",
          icon: <WalletIcon size={16} />,
          href: "wallet",
          id: "wallet-nav",
        },
        {
          label: "Referrals",
          icon: <GiftIcon size={16} />,
          href: "referrals",
          id: "referrals-nav",
        },
        {
          label: "Settings",
          icon: <SettingsIcon size={16} />,
          href: "settings",
          id: "settings-nav",
        },
      ],
    },
  ];

  const getFullPath = (relativePath: string) => {
    const clean = relativePath.replace(/^\//, "").replace(/\/$/, "");
    if (clean === "pricing") return "/pricing";
    if (clean === "hub") return "/hub";
    return `/${clean}`;
  };

  const isNavActive = (relativePath: string) => {
    const clean = relativePath.replace(/^\//, "").replace(/\/$/, "");
    if (clean === "pricing") return pathname === "/pricing";
    if (clean === "products/add") {
      return pathname === "/products/add";
    }
    if (clean === "products") {
      return (
        (pathname === "/" ||
          pathname === "/products" ||
          pathname.startsWith("/products/")) &&
        pathname !== "/products/add"
      );
    }
    if (clean === "hub") return pathname === "/hub";
    return pathname === `/${clean}` || pathname.startsWith(`/${clean}/`);
  };

  return (
    <aside className="hidden lg:flex w-[240px] xl:w-[260px] h-full bg-surface flex-col border-r border-gray-200 dark:border-white/10 overflow-y-auto flex-shrink-0">
      <nav className="flex-1 flex-col px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-dash-micro font-semibold uppercase text-gray-400 dark:text-ink/40 px-3 mb-2 tracking-wider">
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

      <div className="px-3 py-4 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-secondary font-bold overflow-hidden">
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
            {isEnterprise && <EnterpriseAvatarBadge size="md" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-dash-body font-semibold text-ink leading-tight truncate">
                {userDetails?.company?.name}
              </p>
              {isEnterprise && <EnterpriseBadge size="sm" />}
            </div>
            <p className="text-dash-caption text-gray-400 dark:text-ink/50 truncate">
              @{userDetails?.username}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
