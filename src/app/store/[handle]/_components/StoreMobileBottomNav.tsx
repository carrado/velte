"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Storefront,
  MagnifyingGlass,
  ChatCircleDots,
  DotsThree,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export default function StoreMobileBottomNav() {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: "Home", href: "/", icon: House },
    { label: "Store", href: pathname, icon: Storefront, active: true },
    { label: "AI Search", href: "/marketplace", icon: MagnifyingGlass },
    { label: "Chats", href: "/chat", icon: ChatCircleDots, badge: 3 },
    { label: "More", href: "/hub", icon: DotsThree },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 px-2 py-1.5 shadow-lg"
    >
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2 min-w-[56px] relative transition-colors",
                isActive
                  ? "text-[#ff5500] font-semibold"
                  : "text-gray-500 dark:text-ink/60 hover:text-ink font-normal",
              )}
            >
              <div className="relative">
                <Icon
                  size={20}
                  weight={isActive ? "fill" : "regular"}
                  className={isActive ? "text-[#ff5500]" : "currentColor"}
                />
                {item.badge != null && (
                  <span className="absolute -top-1 -right-2 h-4 min-w-[16px] rounded-full bg-[#ff3b30] text-white text-[9px] font-semibold flex items-center justify-center px-1 ring-1 ring-surface">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
