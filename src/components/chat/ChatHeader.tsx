"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { getInitial } from "@/lib/initials";

// The /chat shell's top bar — extracted from SearchHome.tsx (2026-08-17,
// buyer-dashboard removal) so it's owned by chat/layout.tsx and shared
// across every route in the shell (chat itself, Requests, Profile), not
// re-declared per page. Same Sign in/Join ↔ avatar swap SearchHome always
// had for a logged-in VENDOR, now also checking a logged-in BUYER — a
// vendor's own session always wins if somehow both existed (shouldn't in
// practice, separate auth systems), same precedence the rest of the app
// already gives vendor auth over buyer auth.
export function ChatHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const userDetails = useUserStore((state) => state.user);
  const { buyer } = useBuyerSession();
  // Neither identity resolved into an account — nothing for the sidebar/
  // drawer to show, so the hamburger has nothing to open either. Matches
  // ChatSidebar/ChatMobileDrawer's own "render nothing" case for the same
  // reason, kept in sync here rather than guessed independently.
  const hasIdentity = Boolean(userDetails) || Boolean(buyer);

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-8 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 sm:py-2.5 shrink-0 bg-white border-b border-gray-100 z-10">
      <div className="flex items-center gap-2 min-w-0">
        {hasIdentity && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="lg:hidden shrink-0 w-9 h-9 -ml-1.5 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
        )}
        <Link href="/" className="shrink-0">
          <Image
            src="/velte_logo_esn5dj.png"
            alt="Velte"
            width={72}
            height={35}
            className="w-14 h-auto"
            priority
          />
        </Link>
      </div>
      {userDetails ? (
        // A vendor who wandered in from their own dashboard — send them
        // back to it (their wallet, specifically) rather than showing a
        // CTA to sign up for an account they already have.
        <Link
          href={`/${userDetails.id}/wallet`}
          className="flex items-center gap-2 min-w-0 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
            {userDetails.avatar ? (
              <img
                src={userDetails.avatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>
                {getInitial(userDetails.company?.name ?? userDetails.name)}
              </span>
            )}
          </div>
          <span className="max-w-[100px] sm:max-w-[160px] truncate text-xs sm:text-sm font-medium text-gray-800">
            {userDetails.company?.name ?? userDetails.name}
          </span>
        </Link>
      ) : buyer ? (
        <Link
          href="/chat/profile"
          className="flex items-center gap-2 min-w-0 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
            {getInitial(buyer.name ?? "")}
          </div>
          <span className="max-w-[100px] sm:max-w-[160px] truncate text-xs sm:text-sm font-medium text-gray-800">
            {buyer.name ?? "Profile"}
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-4 text-sm font-medium shrink-0">
          <Link
            href="/auth/login"
            className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-2 sm:px-1 sm:py-0"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="flex items-center h-8 sm:h-auto px-3 sm:px-4 sm:py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold sm:font-medium transition-colors whitespace-nowrap"
          >
            Join
          </Link>
        </div>
      )}
    </header>
  );
}
