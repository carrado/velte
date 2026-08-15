"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  ClipboardList,
  Heart,
  User,
  UserRound,
} from "lucide-react";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import { getInitial } from "@/lib/initials";

// Desktop-only nav rail (2026-08-16) — mirrors the vendor dashboard's own
// Sidebar (same 260px width, same NavLink treatment, same bottom
// account-summary block), added specifically so the buyer shell has the
// same desktop chrome weight instead of staying phone-app-shaped on a wide
// screen. Reverses BuyerHeader's own 2026-07 comment ("no Sidebar to pair
// with, buyer nav is bottom-nav-only") — that was true until this was
// explicitly asked for; BuyerBottomNav picked up `lg:hidden` alongside this
// landing so the two stay mutually exclusive, same as the vendor
// Sidebar/BottomNav pair.
//
// No wallet card (unlike the vendor Sidebar) — buyers don't have one, this
// isn't a trimmed copy missing a section, there's genuinely nothing to show
// there. Flat nav list, not grouped into labeled sections either — the
// vendor Sidebar's 3 sections make sense across 8 items, but this is the
// same 5 flat destinations BuyerBottomNav already has; forcing them into
// invented categories would be grouping for its own sake.
const NAV_ITEMS = [
  { label: "Home", icon: Home, href: "/buyer" },
  { label: "Discover", icon: Compass, href: "/buyer/discover" },
  { label: "Requests", icon: ClipboardList, href: "/buyer/requests" },
  { label: "Saved", icon: Heart, href: "/buyer/saved" },
  { label: "Profile", icon: User, href: "/buyer/profile" },
];

export default function BuyerSidebar() {
  const pathname = usePathname();
  const { navigate } = useBuyerNavigation();
  const { buyer } = useBuyerSession();

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 bg-white flex-col border-r border-gray-200 lg:sticky lg:top-0 lg:h-screen lg:self-start overflow-y-auto">
      <div className="flex items-center px-4 py-2 h-[70px] border-b border-gray-200">
        <button onClick={() => navigate("/buyer")} className="cursor-pointer">
          <Image
            src="/velte_logo_esn5dj.png"
            alt="Velte"
            width={80}
            height={39}
            priority
          />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active =
            href === "/buyer"
              ? pathname === "/buyer"
              : pathname.startsWith(href);
          return (
            <button
              key={label}
              onClick={() => navigate(href)}
              className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-dash-body cursor-pointer transition-colors ${
                active
                  ? "bg-orange-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon
                size={16}
                className={active ? "text-white" : "text-gray-500"}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={() => navigate("/buyer/profile")}
          className="w-full flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-secondary font-bold shrink-0 overflow-hidden">
            {buyer?.name ? getInitial(buyer.name) : <UserRound size={15} />}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-dash-body font-semibold text-gray-900 leading-tight truncate">
              {buyer?.name ?? "Guest"}
            </p>
            {buyer?.username && (
              <p className="text-dash-caption text-gray-400 truncate">
                @{buyer.username}
              </p>
            )}
          </div>
        </button>
      </div>
    </aside>
  );
}
