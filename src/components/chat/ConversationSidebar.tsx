"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerStore } from "@/store/buyerStore";
import { useAccountSignOut } from "@/hooks/useAccountSignOut";
import { useChatHistoryStore } from "@/store/chatHistoryStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { LogoutConfirmModal } from "@/components/chat/LogoutConfirmModal";
import { fetchNotifications } from "@/services/notifications";
import { Avatar } from "@/components/Avatar";
import {
  BellIcon,
  ClipboardListIcon,
  CloseIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquareIcon,
  MessageSquarePlusIcon,
  MessageSquareIllustration,
  ShoppingCartIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { SearchConversationList } from "@/types/search";
import type { Buyer } from "@/types/buyer";

// The buyer's conversation sidebar (2026-08-26) — the ChatGPT arrangement:
// a persistent left column on a wide screen, a slide-over on a phone.
//
// Reverses chat/layout.tsx's own 2026-08-18 note that a sidebar isn't
// needed. That was true while buyers had no account and therefore nothing
// to list; they have both now.
//
// ONE component covers both behaviours rather than two, because everything
// inside — the list, the sign-in state, "New chat" — is identical either
// way; only the shell around it differs, and that difference is entirely
// expressible in `lg:` classes. See chatHistoryStore for why the open and
// collapsed flags are separate.
//
// TWO sections once signed in (2026-08-30): the app's own surfaces (Your
// requests, Upgrade) above a divider, the conversation list below it.
// Signed OUT there is deliberately no division — the menu section would be
// empty of anything an anonymous visitor can act on, and the column's whole
// body is already the sign-in prompt, so a divider there would separate a
// heading from nothing.
//
// Rows are titles and timestamps only — the list endpoint deliberately
// never returns turns (see the backend's listConversations). Opening a row
// hands the id to SearchHome through the store; this component never
// touches the thread itself.

const SIDEBAR_WIDTH = 280;

// Shared by every menu row.
//
// py-2, unchanged since the icons here went from 16px to 19px (2026-09-05) —
// a menu row this size already had headroom, and enlarging the icons made
// them the thing a thumb actually aims for instead of an afterthought beside
// the label.
const MENU_ROW_CLASS =
  "flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200/50 hover:text-[#023337]";

function MenuLink({
  href,
  icon,
  label,
  active,
  onNavigate,
  // Unread count, for the rows that have one (2026-09-05). Rendered only
  // when > 0: a "0" badge is a permanent piece of furniture that trains the
  // eye to stop seeing the badge at all, which costs the one that matters.
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onNavigate: () => void;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        MENU_ROW_CLASS,
        active && "border-gray-200 bg-white text-[#023337]",
      )}
    >
      {icon}
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span
          // The count is also announced, not just shown — a bare number
          // beside a label says nothing on its own to a screen reader.
          aria-label={`${badge} unread`}
          className="ml-auto min-w-[20px] rounded-full bg-orange-500 px-1.5 py-0.5 text-center text-[11px] font-bold leading-4 text-white"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function ConversationSidebar() {
  const isOpen = useChatHistoryStore((s) => s.isOpen);
  const setOpen = useChatHistoryStore((s) => s.setOpen);
  const isCollapsed = useChatHistoryStore((s) => s.isCollapsed);
  const setCollapsed = useChatHistoryStore((s) => s.setCollapsed);
  const requestConversation = useChatHistoryStore((s) => s.requestConversation);
  const requestNewChat = useChatHistoryStore((s) => s.requestNewChat);
  const router = useRouter();

  // Opening a chat has to GET YOU TO THE CHAT (2026-09-05).
  //
  // Both actions below only set store state, and the thing that acts on it —
  // SearchHome — lives on the /chat PAGE, while this sidebar lives in the
  // chat LAYOUT (see chatHistoryStore's own note on why they are on opposite
  // sides of the tree). On /chat that works. On /chat/notifications or
  // /chat/requests, SearchHome is not mounted at all, so the request was set
  // and nothing ever consumed it: the row highlighted, the drawer closed,
  // and the buyer stayed exactly where they were.
  //
  // The store request is still set FIRST and the navigation second — the
  // request must already be in place by the time SearchHome mounts and its
  // effects read it, and the store survives a client-side navigation.
  const goToChat = () => {
    if (pathname !== "/chat") router.push("/chat");
  };

  const openConversation = (conversationId: string) => {
    requestConversation(conversationId);
    goToChat();
  };

  const startNewChat = () => {
    requestNewChat();
    goToChat();
  };
  const buyer = useBuyerStore((s) => s.buyer);
  const pathname = usePathname();

  // Mobile only in effect: on desktop the slide-over flag is already false
  // and setting it again changes nothing, so one handler covers both.
  const closeOnMobile = () => setOpen(false);

  // Fetched whenever a buyer exists — unlike the drawer this replaced, the
  // sidebar is VISIBLE by default on desktop, so gating the query on "open"
  // would leave a permanently empty column. Still gated on a buyer: the
  // endpoint 401s for an anonymous caller by design, and most traffic here
  // is still anonymous.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["buyer", "conversations"],
    queryFn: () =>
      buyerApi.get<SearchConversationList>("/api/search/conversations"),
    enabled: Boolean(buyer),
    staleTime: 30_000,
  });

  // The unread badge on the Notifications row (2026-09-05).
  //
  // Its own query rather than a field on the conversations one above: the two
  // answer different questions, change on different schedules, and a
  // notification arriving should not invalidate a conversation list.
  //
  // `refetchInterval` because a notification (a vendor accepting a buyer
  // request, say) fires from a SWEEP, not from anything this browser did —
  // nothing in the page would otherwise know one had appeared until the
  // next full reload. A minute is slow enough to be free and quick enough
  // that the badge isn't stale by the time someone looks at the menu.
  //
  // Shares the ["notifications"] key with the page itself, so opening it and
  // marking things read updates this badge with no extra request.
  const { data: notificationData } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: Boolean(buyer),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadCount = notificationData?.unreadCount ?? 0;

  // Escape closes the MOBILE slide-over only. On desktop the sidebar is
  // part of the page, not an overlay — Escape collapsing it would be a
  // surprise, not a convenience.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setOpen]);

  const conversations = data?.conversations ?? [];

  return (
    <>
      {/* Scrim — mobile only. On desktop nothing sits behind the sidebar to
          dim, and a scrim there would block the thread it's next to. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-gray-900/20 transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        aria-label="Your conversations"
        style={{ width: SIDEBAR_WIDTH }}
        className={cn(
          // Mobile: an overlay pinned to the left edge, driven by isOpen.
          "fixed inset-y-0 left-0 z-50 shrink-0 bg-[#FAFAFA] border-r border-gray-100 flex flex-col transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: a real column in the layout flow, never transformed.
          // Collapsing animates the WIDTH to zero rather than sliding it
          // away, so the thread beside it expands into the space instead of
          // leaving a gap.
          "lg:static lg:z-auto lg:translate-x-0 lg:transition-[width] lg:duration-200",
          isCollapsed && "lg:w-0 lg:border-r-0 lg:overflow-hidden",
        )}
      >
        {/* Fixed to the sidebar's own width so its contents don't reflow
            while the width animates to zero on collapse. */}
        <div className="flex flex-col h-full" style={{ width: SIDEBAR_WIDTH }}>
          <header className="flex items-center justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2 shrink-0">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
              {buyer ? "Menu" : "Your chats"}
            </h2>
            {/* Two controls, one per breakpoint — see the store's own note
                on why the two states are separate. */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              <CloseIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              <MenuIcon size={17} />
            </button>
          </header>

          {/* Section one — the app's surfaces that aren't a conversation.
              Signed-in only, per the note at the top of this file. */}
          {buyer && (
            <>
              <nav className="px-3 pb-3 shrink-0 space-y-0.5">
                <MenuLink
                  href="/chat/notifications"
                  icon={<BellIcon size={19} className="shrink-0" />}
                  label="Notifications"
                  active={pathname === "/chat/notifications"}
                  onNavigate={closeOnMobile}
                  badge={unreadCount}
                />
                <MenuLink
                  href="/chat/requests"
                  icon={<ClipboardListIcon size={19} className="shrink-0" />}
                  label="Your requests"
                  active={pathname === "/chat/requests"}
                  onNavigate={closeOnMobile}
                />
                <MenuLink
                  href="/chat/plans"
                  icon={<ShoppingCartIcon size={19} className="shrink-0" />}
                  label="Your plans"
                  active={
                    pathname === "/chat/plans" ||
                    pathname.startsWith("/chat/plans/")
                  }
                  onNavigate={closeOnMobile}
                />
                {/* The credit meter used to sit here as a third row. It went
                    back to the header (2026-09-01) where it is visible without
                    opening or expanding anything — a prepaid balance the
                    reader has to go looking for is one they stop trusting —
                    and rendering it in both places would have meant two live
                    meters and two balance fetches for one number. */}
              </nav>

              <div className="mx-3 mb-3 border-t border-gray-200/70 shrink-0" />

              <h2 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 shrink-0">
                Your chats
              </h2>
            </>
          )}

          {/* Always available, signed in or not — without it there's no way
              back to a fresh thread once an old one is open, which is the
              first thing anyone tries after opening one. */}
          <div className="px-3 pb-2 shrink-0">
            <button
              type="button"
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-orange-200 hover:bg-orange-50/40 transition-colors cursor-pointer"
            >
              <MessageSquarePlusIcon size={19} className="text-orange-500" />
              <span className="text-sm font-medium text-[#023337]">
                New chat
              </span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {!buyer ? (
              // The signed-out state IS the sign-in prompt — a history is
              // the one thing an account actually buys the buyer, so this
              // is the honest place to ask for one rather than a banner
              // over the thread.
              <div className="flex flex-col items-center text-center gap-4 px-5 py-10">
                <MessageSquareIllustration size={64} />
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-[#023337]">
                    Keep your searches
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sign in and every conversation — the vendors, the photos,
                    the prices you were shown — stays here for you to come back
                    to.
                  </p>
                </div>
                <GoogleSignInButton />
              </div>
            ) : isLoading ? (
              <ul className="px-3 space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <li
                    key={i}
                    className="h-12 rounded-xl bg-gray-200/60 animate-pulse"
                  />
                ))}
              </ul>
            ) : isError ? (
              <div className="px-5 py-10 text-center space-y-3">
                <p className="text-sm text-gray-500">
                  Couldn&apos;t load your conversations.
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-500">
                  Nothing here yet — your searches will show up as you make
                  them.
                </p>
              </div>
            ) : (
              <ul className="px-3 pb-4 space-y-0.5">
                {conversations.map((c) => (
                  <li key={c.conversationId}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.conversationId)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-200/50 transition-colors cursor-pointer group"
                    >
                      <span className="flex items-start gap-2.5">
                        <MessageSquareIcon
                          size={16}
                          className="text-gray-300 group-hover:text-orange-400 shrink-0 mt-0.5 transition-colors"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-[#023337] truncate">
                            {c.title}
                          </span>
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            {relativeTime(c.lastActiveAt)}
                            {c.turnCount > 0 && (
                              <>
                                {" · "}
                                {c.turnCount}{" "}
                                {c.turnCount === 1 ? "message" : "messages"}
                              </>
                            )}
                            {c.status === "handed_off" && (
                              <span className="text-orange-500">
                                {" · "}Contacted a vendor
                              </span>
                            )}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Account footer — the ChatGPT arrangement, and the honest place
              for it: this column already IS the account's data, so signing
              out belongs at the bottom of it rather than hidden behind the
              header chip (which is deliberately not interactive — there's no
              buyer profile page to open).

              Only rendered for a signed-in buyer; signed out, the column's
              whole body is already the sign-in prompt. */}
          {buyer && <BuyerAccountFooter buyer={buyer} />}
        </div>
      </aside>
    </>
  );
}

function BuyerAccountFooter({ buyer }: { buyer: Buyer }) {
  // Moved into a shared hook (2026-09-05) so the account menu in ChatHeader
  // runs the SAME sign-out rather than a second copy of it. The cleanup this
  // does — clearing the query cache and the stored conversation id — is a
  // privacy fix on shared devices, and two copies of it is one to forget.
  const { signOut, busy } = useAccountSignOut();
  // A confirm step, not an immediate sign-out (2026-09-05, per explicit
  // request) — the button sits at the bottom of a menu of otherwise
  // harmless navigation rows, exactly where a mis-tap lands after scrolling.
  // Signing out mid-search costs the visible thread (SearchHome holds it in
  // component state; useAccountSignOut does a full navigation to drop it),
  // so a stray tap here is more expensive than most confirm dialogs guard
  // against.
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="shrink-0 border-t border-gray-200/70 px-3 py-3">
      <div className="flex items-center gap-2.5 px-1">
        <Avatar
          src={buyer.avatar}
          label={(buyer.name ?? buyer.email ?? "?")
            .trim()
            .charAt(0)
            .toUpperCase()}
          className="h-7 w-7"
        />
        <span className="min-w-0 flex-1 truncate text-sm text-[#023337]">
          {buyer.name ?? buyer.email}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-200/50 hover:text-gray-700 cursor-pointer"
      >
        <LogOutIcon size={19} className="shrink-0 text-gray-400" />
        {/* "Log out", not "Sign out" (2026-09-05, per explicit request) —
            matches the label ChatHeader's own account menu already uses, so
            the two places this action lives don't say two different things
            for the same click. */}
        <span>Log out</span>
      </button>
      {confirming && (
        <LogoutConfirmModal
          busy={busy}
          onClose={() => setConfirming(false)}
          onConfirm={signOut}
        />
      )}
    </div>
  );
}
