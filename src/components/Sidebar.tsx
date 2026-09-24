"use client";
/* eslint-disable @next/next/no-img-element */

import { usePathname } from "next/navigation";
import { VelteLogo } from "@/components/VelteLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigation } from "@/components/NavigationProgressContext";
import { useUserStore } from "@/store/userStore";
import { getInitial } from "@/lib/initials";
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
} from "@/components/icons/hero";

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

// Desktop-only navigation rail. On mobile the BottomNav is the sole
// navigation surface — there is no drawer.
export default function Sidebar() {
  const pathname = usePathname();
  const userDetails = useUserStore((state) => state.user);
  // Requests matched to this vendor that they haven't accepted or declined.
  const pendingRequests = usePendingBuyerRequests();

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
          icon: <StoreIcon size={16} />,
          href: "store",
          id: "store-nav",
        },
        {
          label: "Buyer Requests",
          icon: <MessageSquareIcon size={16} />,
          href: "buyer-requests",
          id: "buyer-requests-nav",
          badge: pendingRequests,
        },
      ],
    },
    {
      title: "Account",
      items: [
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
    <aside className="hidden lg:flex w-[260px] h-full bg-surface flex-col border-r border-gray-200 overflow-y-auto flex-shrink-0">
      <div className="flex items-center px-4 py-2 h-[70px] border-b border-gray-200">
        <div className="flex gap-1.5">
          {/* Swapped off the stale Cloudinary-hosted copy (2026-08-14) —
              that upload predates the local file's crop, so it still had
              the old ~40%-empty-margin version baked in. The local
              /public asset is the single source of truth for this logo
              everywhere else; this brings Sidebar in line with that.
              The `-ml-4` that used to sit here was compensating for that
              old baked-in margin — with the properly-cropped local asset
              it just dragged the logo past the row's own px-4 padding, up
              against the sidebar's left edge (2026-08-17, reported too
              close to the edge). Dropped now that there's nothing left to
              compensate for. */}
          <VelteLogo alt="Velte logo" width={56} height={27} />
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

      {/* Same control, same placement logic as /chat's own sidebar (2026-09-18).
          `size="sm"` (not `iconOnly`) — the labels stay, just tightened
          enough to fit this fixed 260px rail; `fullWidth` because this
          sidebar renders only at `lg:` and up, well past the `sm` breakpoint
          the component's own default auto-width behaviour keys off. */}
      <div className="px-3 py-3 border-t border-gray-200">
        <ThemeToggle size="sm" fullWidth className="justify-between" />
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
