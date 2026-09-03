"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";
import { useChatHistoryStore } from "@/store/chatHistoryStore";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { BellIcon, MenuIcon } from "@/components/icons";
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
// plans are a modal over the chat now (components/credits/CreditsModal.tsx) — so
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

  // 2026-08-30: Watching MOVED into the conversation sidebar's own menu
  // section — but only where that section actually renders, which needs a
  // buyer session (the sidebar's own divided/undivided condition). Otherwise
  // it stays here:
  //   - a signed-out visitor's sidebar is the sign-in prompt, undivided, so
  //     removing it from the header would leave no route to it;
  //   - a vendor with no buyer cookie sees that same signed-out sidebar,
  //     which is why this keys on `buyer` and not on `userDetails`.
  //
  // The CREDIT METER is not in this header at all (2026-09-01, per explicit
  // request). It is the floating ring in the bottom-right corner from `lg` up
  // (credits/CreditsFab.tsx), and BELOW `lg` there is deliberately no meter:
  // a phone header is already the logo, the sidebar toggle and either an
  // identity chip or the vendor CTA, and a gauge was one thing too many.
  //
  // NOTE the consequence — on a phone nothing opens the credits panel except
  // a refusal (SearchHome's QuotaCard) or the negotiation brief's own prompt.
  // If a standing entry point is wanted back, the sidebar's menu section is
  // where it belongs: that is already the mobile navigation.
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
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {userDetails ? (
          // A vendor who wandered in from their own dashboard — send them
          // back to it (their wallet, specifically) rather than showing a
          // CTA to sign up for an account they already have. Plus Watching
          // (2026-08-29): a vendor can watch competitors' prices, which is
          // one of the better reasons for them to be on /chat at all.
          <div className="flex min-w-0 items-center gap-1">
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
          <div className="flex min-w-0 items-center gap-1">
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
          <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium sm:gap-4">
            {/* Guests see the meter too (2026-08-29, per explicit request):
                they have the most to learn from what credits are, and there
                is nobody it should be hidden from now that it shows a
                balance rather than a tier. */}

            {/* ONE vendor CTA, named for what it does (2026-09-01).
                //
                // This was "Sign in" + "Join", and both pointed at
                // /auth/login and /auth/signup — which are VENDOR-only (see
                // that page's own header comment; /join is just a redirect
                // into it). On a surface whose signed-out visitors are
                // overwhelmingly buyers that was not clutter, it was wrong:
                // buyer sign-in here is Google, and it already lives in the
                // sidebar's signed-out state, so a guest saw two sign-in
                // affordances creating two different kinds of account, with
                // the louder one aimed at the wrong one.
                //
                // It failed worst at the best moment. A guest who spends
                // their credits is told "create a free account and get 15" —
                // and the nearest button labelled "Join" dropped them into a
                // business registration wizard asking for a company name.
                //
                // A signed-out VENDOR still gets to their dashboard from
                // here, via the signup page's own log-in link. One extra
                // click for the rarer case, and they mostly arrive through
                // /launch or a bookmark anyway. */}
            <Link
              href="/auth/signup"
              className="flex items-center h-8 sm:h-auto px-3 sm:px-4 sm:py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold sm:font-medium transition-colors whitespace-nowrap"
            >
              Sell on Velte
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
