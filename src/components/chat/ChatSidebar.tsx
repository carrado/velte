"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { getInitial } from "@/lib/initials";
import { useChatNavItems } from "@/components/chat/useChatNavItems";

// Desktop-only nav rail for the /chat shell (2026-08-17, buyer-dashboard
// removal) — same 260px width / visual language as the vendor dashboard's
// own Sidebar.tsx and the retired BuyerSidebar.tsx, just serving both
// identities from one component since /chat is shared ground. Renders
// nothing at all when neither a vendor nor a buyer is logged in — same as
// today's anonymous /chat, no sidebar to speak of.
export function ChatSidebar() {
  const pathname = usePathname();
  const userDetails = useUserStore((state) => state.user);
  const { buyer } = useBuyerSession();
  const items = useChatNavItems();

  if (!items) return null;

  const accountLabel = userDetails
    ? (userDetails.company?.name ?? userDetails.name)
    : (buyer?.name ?? "Guest");
  const accountAvatar = userDetails?.avatar;
  const accountHref = userDetails
    ? `/${userDetails.id}/wallet`
    : "/chat/profile";

  return (
    // `h-full`, not `sticky`/`h-screen` — unlike the vendor Sidebar/retired
    // BuyerSidebar (full-viewport pages with document-level scroll, so a
    // sticky sidebar makes sense), this one lives inside chat/layout.tsx's
    // own fixed-height row (the page itself doesn't scroll, only the chat
    // content does) — h-full just stretches it to match that row exactly.
    <aside className="hidden lg:flex w-[260px] h-full shrink-0 bg-white flex-col border-r border-gray-200 overflow-y-auto">
      <div className="flex-1 px-3 py-4 space-y-0.5">
        {items.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={label}
              href={href}
              className={`w-full flex items-center gap-3 py-3 px-3 rounded-lg text-base cursor-pointer transition-colors ${
                active
                  ? "bg-orange-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon
                size={19}
                className={active ? "text-white" : "text-gray-500"}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      <div className="px-3 py-4 border-t border-gray-200">
        <Link
          href={accountHref}
          className="w-full flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
            {accountAvatar ? (
              <img
                src={accountAvatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              getInitial(accountLabel)
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
              {accountLabel}
            </p>
            {userDetails?.username && (
              <p className="text-xs text-gray-400 truncate">
                @{userDetails.username}
              </p>
            )}
          </div>
        </Link>
      </div>
    </aside>
  );
}
