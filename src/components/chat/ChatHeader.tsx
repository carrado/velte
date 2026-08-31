"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";
import { useChatHistoryStore } from "@/store/chatHistoryStore";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { BellIcon, MenuIcon } from "@/components/icons";
import { UpgradeCta } from "@/components/chat/UpgradeCta";
import { getInitial } from "@/lib/initials";

// The /chat shell's top bar: the logo, a way into the buyer's own
// conversation history, and — for a signed-in VENDOR — a link back to their
// dashboard.
//
// The sidebar toggle is new (2026-08-26), as is the buyer chip — which
// reverses the 2026-08-18 note that used to sit here ("buyers are anonymous,
// so there's no buyer identity to show a chip for"): buyers have real
// accounts now, and their past conversations are the thing those accounts
// exist for.
//
// The toggle is shown to EVERYONE, not just a signed-in buyer, on purpose —
// the sidebar's signed-out state is itself the sign-in prompt, which puts
// the ask exactly where the reason for it is, rather than in a banner over
// the thread. Vendor and buyer sessions are independent cookies, so a vendor
// browsing /chat can have a buyer history of their own and still see their
// dashboard link.
//
// It briefly took `showSidebarToggle` / `showUpgrade` props (2026-08-29) so
// the /plans route could reuse it with neither control. That route is gone —
// plans are a modal over the chat now (components/plans/PlansModal.tsx) — so
// this renders on exactly one surface again and the props went with it.
// Configuration kept "in case" is configuration nobody can test.
export function ChatHeader() {
  const userDetails = useUserStore((state) => state.user);
  const setSidebarOpen = useChatHistoryStore((s) => s.setOpen);
  const isSidebarCollapsed = useChatHistoryStore((s) => s.isCollapsed);
  const setSidebarCollapsed = useChatHistoryStore((s) => s.setCollapsed);
  // Hydrates the buyer from the session cookie on load, so the sidebar
  // renders its signed-in state on first paint rather than flashing the
  // sign-in prompt at a buyer who already has an account. Called here rather
  // than in the sidebar because the sidebar's own list query is gated on a
  // buyer already being known.
  useBuyerSession();
  const buyer = useBuyerStore((s) => s.buyer);

  // One string, three call sites — they were three identical literals, and
  // the third (guests) had already drifted a `label` apart from the others.
  const upgradeCtaClass =
    "hidden sm:inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-100";

  // 2026-08-30: Watching and Upgrade MOVED into the conversation sidebar's
  // own menu section — but only where that section actually renders, which
  // needs a buyer session (the sidebar's own divided/undivided condition).
  // Otherwise they stay here:
  //   - a signed-out visitor's sidebar is the sign-in prompt, undivided, so
  //     removing them from the header would leave no route to either;
  //   - a vendor with no buyer cookie sees that same signed-out sidebar,
  //     which is why this keys on `buyer` and not on `userDetails`.
  const menuInSidebar = Boolean(buyer);

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-8 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 sm:py-2.5 shrink-0 bg-white border-b border-gray-100 z-10">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {/* Mobile: opens the slide-over. Desktop: only rendered while the
            sidebar is collapsed — expanded, the sidebar carries its own
            collapse control, so a second always-visible toggle here would
            be a duplicate. */}
        {
          <>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open your conversations"
              className="lg:hidden w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <MenuIcon size={19} />
            </button>
            {isSidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expand sidebar"
                className="hidden lg:flex w-9 h-9 -ml-1.5 rounded-lg items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <MenuIcon size={19} />
              </button>
            )}
          </>
        }
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
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {userDetails ? (
          // A vendor who wandered in from their own dashboard — send them
          // back to it (their wallet, specifically) rather than showing a
          // CTA to sign up for an account they already have. Plus Watching
          // (2026-08-29): a vendor can watch competitors' prices, which is
          // one of the better reasons for them to be on /chat at all.
          <div className="flex items-center gap-1 min-w-0">
            {!menuInSidebar && <UpgradeCta className={upgradeCtaClass} />}
            {!menuInSidebar && (
              <Link
                href="/chat/watches"
                title="Prices you're watching"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <BellIcon size={16} className="shrink-0" />
                <span className="hidden sm:inline">Watching</span>
              </Link>
            )}
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
          </div>
        ) : buyer ? (
          // A signed-in BUYER. The chip itself is still deliberately not a
          // link — there is no buyer profile page and building one isn't the
          // deal; it exists so they can see which account their history
          // belongs to, which matters most on a shared phone. What DID need
          // a home (2026-08-29) is Watching: a buyer who saves a price has
          // to be able to see it's still running, or the feature can't be
          // trusted. Icon-only on small screens, where the name chip is
          // already competing for the same row.
          <div className="flex items-center gap-1 min-w-0">
            {/* Hidden below `sm` in both branches: this row already carries a
                name chip and Watching, and a third control is what makes it
                wrap on a phone. The plans page stays reachable there through
                the quota message's own upgrade button. */}
            {!menuInSidebar && <UpgradeCta className={upgradeCtaClass} />}
            {!menuInSidebar && (
              <Link
                href="/chat/watches"
                title="Prices you're watching"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <BellIcon size={16} className="shrink-0" />
                <span className="hidden sm:inline">Watching</span>
              </Link>
            )}
            <span
              className="flex items-center gap-2 min-w-0 pl-1 pr-2 sm:pr-3 py-1"
              title={buyer.email ?? undefined}
            >
              <span className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                {buyer.avatar ? (
                  <img
                    src={buyer.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitial(buyer.name ?? buyer.email ?? "?")}</span>
                )}
              </span>
              <span className="hidden sm:block max-w-[140px] truncate text-sm font-medium text-gray-800">
                {buyer.name ?? buyer.email}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-4 text-sm font-medium shrink-0">
            {/* Guests see it too (2026-08-29, per explicit request) — they
                have the most to learn from the plans page, and it is hidden
                on exactly one tier: the highest. "Plans" rather than
                "Upgrade" here, since there is nothing yet to upgrade FROM;
                the word only makes sense once you're on something. */}
            {<UpgradeCta label="Plans" className={upgradeCtaClass} />}
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
      </div>
    </header>
  );
}
