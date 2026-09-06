"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";
import { useChatHistoryStore } from "@/store/chatHistoryStore";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import {
  LogOutIcon,
  MenuIcon,
  StoreIcon,
  WalletIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { getInitial } from "@/lib/initials";
import { Avatar } from "@/components/Avatar";
import { CreditsButton } from "@/components/credits/CreditsModal";
import AnchoredPopover from "@/components/AnchoredPopover";
import { useAccountSignOut } from "@/hooks/useAccountSignOut";
import { LogoutConfirmModal } from "@/components/chat/LogoutConfirmModal";

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

  // The credit METER (the balance/used figures) still isn't in this header
  // (2026-09-01, per explicit request) — that stays the floating ring from
  // `lg` up (credits/CreditsFab.tsx) and CreditsBar below it. What IS here
  // now (2026-09-05, per explicit request, reversing the "one gauge is
  // enough" call above) is a plain "Top up" CTA — <CreditsButton>, the same
  // ready-made trigger every other top-up entry point uses. Shown in EVERY
  // identity state (vendor, buyer, guest): vendors fund credits from card or
  // wallet same as buyers, and CreditsModal already degrades a signed-out
  // tap to a sign-in offer rather than a checkout that would 401 — so
  // there's no state where this button would be dead weight.

  // WHICH VENDOR DASHBOARD THIS PERSON HAS, if any (2026-09-05).
  //
  // Two ways to have one, and until now only the first showed the CTA:
  //
  //   1. A LIVE vendor session — `auth_token` present, hydrated into
  //      userStore by VendorSessionSync. This is a vendor who came here from
  //      their own dashboard.
  //   2. A LINKED one — they signed into /chat with Google using the same
  //      address as their vendor account, so all they hold here is a buyer
  //      cookie. `Buyer.linkedVendorId` is the record of that, written at
  //      sign-in only when BOTH halves have proven they own the address
  //      (Firebase on the buyer side, the signup OTP on the vendor side).
  //
  // Case 2 is the one that was stranded, and it is the common one: someone
  // who signed up through /chat is not logged into the dashboard in this
  // browser, so `userDetails` is null and there was no route to their
  // dashboard anywhere on this page — while the logo, the obvious fallback,
  // is bounced to /chat for exactly the same buyer.
  //
  // This is the first thing to read across that link. It was built for a
  // retired plan feature and kept on the reasoning that the hard part is
  // PROVING both halves are the same human — which is precisely what makes
  // it safe to offer someone a way into a vendor account from here.
  const vendorDashboardId = userDetails?.id ?? buyer?.linkedVendorId ?? null;

  // A linked buyer holds no vendor cookie, so following this link lands on
  // /auth/login?redirect=… — proxy.ts guards the dashboard, correctly. That
  // is the honest destination and worth signalling in the label rather than
  // promising a dashboard and delivering a login form.
  const dashboardNeedsSignIn = !userDetails && Boolean(buyer?.linkedVendorId);

  // The identity chip opens a menu (2026-09-05, per explicit request —
  // moved out of the header row, where it was a fourth control competing
  // with three lookalikes on a bar that has to survive a 360px phone).
  //
  // Clicking your own name to find what you can do with your account is the
  // convention everywhere else, and it also gives the one place this shell
  // has been missing: somewhere for account actions to go without each new
  // one costing another slot on the top bar.
  //
  // AnchoredPopover rather than an absolutely-positioned panel — the header
  // sits inside the chat shell's `overflow-hidden` column, which is exactly
  // the ancestor that swallows a bare dropdown (see that component's own
  // note). It portals to the body instead.
  const [menuOpen, setMenuOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  // Shared with the sidebar's own sign-out (2026-09-05) — see the hook. It
  // clears BOTH sessions when both exist, which is what "Log out" has to
  // mean in a single account menu.
  const { signOut, busy: signingOut } = useAccountSignOut();
  // A confirm step before it actually runs (2026-09-05, per explicit
  // request) — same LogoutConfirmModal the sidebar's own "Log out" opens,
  // so the action reads identically wherever it's reached from. Separate
  // from `menuOpen`: the popover closes the instant this opens (see the
  // button below), so the two are never both true, but keeping them as two
  // flags rather than one avoids the confirm modal's own open/close from
  // being read as "the account menu is open" by anything else watching it.
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const menuItemClass =
    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-[#023337] transition-colors hover:bg-gray-50";

  const accountMenu = (
    <AnchoredPopover
      open={menuOpen}
      onClose={() => setMenuOpen(false)}
      anchorRef={chipRef}
      align="right"
      className="w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
    >
      {vendorDashboardId ? (
        <Link
          href={`/${vendorDashboardId}/wallet`}
          onClick={() => setMenuOpen(false)}
          className={menuItemClass}
        >
          <StoreIcon size={17} className="shrink-0 text-orange-500" />
          <span className="min-w-0">
            <span className="block">Vendor dashboard</span>
            {/* A linked buyer holds no vendor cookie, so this lands on
                /auth/login?redirect=… — proxy.ts guards the dashboard,
                correctly. Said here rather than discovered on arrival. */}
            {dashboardNeedsSignIn && (
              <span className="block text-xs font-normal text-gray-500">
                Sign in to continue
              </span>
            )}
          </span>
        </Link>
      ) : (
        // A buyer with no vendor account at all. The menu still opens —
        // an identity chip that does nothing on some accounts and something
        // on others is worse than one that always explains itself — and
        // this is where selling gets offered, which is a route worth having.
        <Link
          href="/join"
          onClick={() => setMenuOpen(false)}
          className={menuItemClass}
        >
          <StoreIcon size={17} className="shrink-0 text-orange-500" />
          <span>Sell on Velte</span>
        </Link>
      )}

      {/* Separated by a rule, and last: it is the one item here that is
          destructive-ish and irreversible in a single click, so it should
          never sit flush against the thing above it where a mis-tap lands
          on it. */}
      <div className="my-1 border-t border-gray-100" />
      <button
        type="button"
        onClick={() => {
          // Close the popover first — leaving it open behind the confirm
          // modal would mean two overlays stacked for one action, and a
          // click that lands on the popover's own backdrop-less area while
          // the modal is up would otherwise be ambiguous about which one
          // it was meant for.
          setMenuOpen(false);
          setConfirmingLogout(true);
        }}
        className={cn(menuItemClass, "cursor-pointer text-gray-600")}
      >
        <LogOutIcon size={17} className="shrink-0 text-gray-400" />
        <span>Log out</span>
      </button>
    </AnchoredPopover>
  );

  return (
    <>
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
          {/* "/" for a guest and for a vendor — a vendor's "/" is bounced to
            their dashboard by proxy.ts, which is where the logo should take
            them anyway. For a signed-in BUYER it points at /chat directly:
            proxy.ts now sends their "/" here too (they belong in the chat,
            not the marketing site), and routing a click through a server
            redirect to land where they already are is a round trip for
            nothing. */}
          <Link
            href={buyer && !userDetails ? "/chat" : "/"}
            className="shrink-0"
          >
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
            // CTA to sign up for an account they already have.
            <div className="flex min-w-0 items-center gap-1">
              <CreditsButton className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                {/* 20, up from 16 (2026-09-05, per explicit request) — the
                  wallet was reading as a decoration beside its own label
                  rather than as the thing you tap. */}
                <WalletIcon size={20} className="shrink-0" />
                <span>Top up</span>
              </CreditsButton>
              {/* The chip is the MENU TRIGGER now, not a bare link to the
                wallet. It used to navigate on click, which was the whole
                problem: nothing about a chip showing your own company name
                says "dashboard", so the one route back was invisible. */}
              <button
                ref={chipRef}
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Your account"
                className="flex cursor-pointer items-center gap-2 min-w-0 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Avatar
                  src={userDetails.avatar}
                  alt="avatar"
                  label={getInitial(
                    userDetails.company?.name ?? userDetails.name,
                  )}
                  className="w-7 h-7"
                />
                <span className="max-w-[100px] sm:max-w-[160px] truncate text-xs sm:text-sm font-medium text-gray-800">
                  {userDetails.company?.name ?? userDetails.name}
                </span>
              </button>
              {accountMenu}
            </div>
          ) : buyer ? (
            // A signed-in BUYER. The chip itself is still deliberately not a
            // link — there is no buyer profile page and building one isn't the
            // deal; it exists so they can see which account their history
            // belongs to, which matters most on a shared phone.
            <div className="flex min-w-0 items-center gap-1">
              <CreditsButton className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                {/* 20, up from 16 (2026-09-05, per explicit request) — the
                  wallet was reading as a decoration beside its own label
                  rather than as the thing you tap. */}
                <WalletIcon size={20} className="shrink-0" />
                <span>Top up</span>
              </CreditsButton>
              {/* Now a trigger, reversing the "deliberately not a link" note
                that used to sit here. The reasoning behind that note still
                holds — there is no buyer PROFILE page and building one isn't
                the deal — but a menu is not a profile page, and it is where
                a linked vendor finds their dashboard. */}
              <button
                ref={chipRef}
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Your account"
                title={buyer.email ?? undefined}
                className="flex cursor-pointer items-center gap-2 min-w-0 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Avatar
                  src={buyer.avatar}
                  label={getInitial(buyer.name ?? buyer.email ?? "?")}
                  className="w-7 h-7"
                />
                <span className="hidden sm:block max-w-[140px] truncate text-sm font-medium text-gray-800">
                  {buyer.name ?? buyer.email}
                </span>
              </button>
              {accountMenu}
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium sm:gap-4">
              {/* Guests see the meter too (2026-08-29, per explicit request):
                they have the most to learn from what credits are, and there
                is nobody it should be hidden from now that it shows a
                balance rather than a tier. This is that entry point
                (2026-09-05) — CreditsModal already shows a sign-in offer
                instead of the pack grid for a signed-out tap, so there's
                nothing broken about surfacing it here too. */}
              <CreditsButton className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 sm:px-3 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                {/* 20, up from 16 (2026-09-05, per explicit request) — the
                  wallet was reading as a decoration beside its own label
                  rather than as the thing you tap. */}
                <WalletIcon size={20} className="shrink-0" />
                <span>Top up</span>
              </CreditsButton>

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
      {confirmingLogout && (
        <LogoutConfirmModal
          busy={signingOut}
          onClose={() => setConfirmingLogout(false)}
          onConfirm={signOut}
        />
      )}
    </>
  );
}
