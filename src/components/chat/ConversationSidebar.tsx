"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerStore } from "@/store/buyerStore";
import { useIsStandalone } from "@/hooks/useIsStandalone";
import { logoutBuyer } from "@/services/buyerAuth";
import { SEARCH_CONVERSATION_ID_STORAGE_KEY } from "@/lib/searchConversation";
import { useChatHistoryStore } from "@/store/chatHistoryStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import {
  CloseIcon,
  MenuIcon,
  MessageSquareIcon,
  MessageSquarePlusIcon,
  MessageSquareIllustration,
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
// Rows are titles and timestamps only — the list endpoint deliberately
// never returns turns (see the backend's listConversations). Opening a row
// hands the id to SearchHome through the store; this component never
// touches the thread itself.

const SIDEBAR_WIDTH = 280;

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
  const buyer = useBuyerStore((s) => s.buyer);

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
              Your chats
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

          {/* Always available, signed in or not — without it there's no way
              back to a fresh thread once an old one is open, which is the
              first thing anyone tries after opening one. */}
          <div className="px-3 pb-2 shrink-0">
            <button
              type="button"
              onClick={requestNewChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-orange-200 hover:bg-orange-50/40 transition-colors cursor-pointer"
            >
              <MessageSquarePlusIcon size={16} className="text-orange-500" />
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
                      onClick={() => requestConversation(c.conversationId)}
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
  const clearBuyer = useBuyerStore((s) => s.clearBuyer);
  const queryClient = useQueryClient();
  const isStandalone = useIsStandalone();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logoutBuyer();
    } catch {
      // The cookie may or may not have been cleared upstream, but there is
      // nothing useful to say and nothing to retry — everything below runs
      // regardless so the buyer is signed out LOCALLY either way. Leaving
      // them looking signed-in after they asked not to be is the one
      // outcome worth avoiding.
    }

    clearBuyer();
    // Their conversations and watches are account data — they must not sit
    // in the cache for whoever uses this browser next.
    queryClient.clear();

    // THE IMPORTANT ONE, on a shared phone especially: /chat resumes from a
    // conversation id in localStorage (see chat/layout.tsx's pre-paint
    // check). Left behind, the next person to open Velte on this device
    // silently reopens the previous buyer's thread — vendors, photos,
    // prices and all.
    try {
      localStorage.removeItem(SEARCH_CONVERSATION_ID_STORAGE_KEY);
    } catch {
      /* blocked storage — nothing was stored to leak either */
    }

    // A full navigation, not a router push: SearchHome holds the whole
    // thread in component state, and only a real document load is
    // guaranteed to drop it. replace(), so the signed-in page isn't one
    // back-press away (and can't be served from bfcache without hitting
    // middleware) — same reasoning as the vendor logout in Header.tsx.
    //
    // /welcome inside the installed app, /chat in a browser: a buyer who
    // signs out is still a buyer, and can keep searching as a guest.
    window.location.replace(isStandalone ? "/welcome" : "/chat");
  };

  return (
    <div className="shrink-0 border-t border-gray-200/70 px-3 py-3">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500 text-xs font-bold text-white">
          {buyer.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buyer.avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            (buyer.name ?? buyer.email ?? "?").trim().charAt(0).toUpperCase()
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-[#023337]">
          {buyer.name ?? buyer.email}
        </span>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-200/50 hover:text-gray-700 disabled:opacity-60 cursor-pointer"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
