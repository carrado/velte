"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { buyerApi } from "@/lib/buyer-api-client";
import { useNavigation } from "@/components/chat/ChatNavigationProgressContext";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { useAccountSignOut } from "@/hooks/useAccountSignOut";
import { useChatHistoryStore } from "@/store/chatHistoryStore";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { CreditsSidebarMeter } from "@/components/credits/CreditsSidebarMeter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutConfirmModal } from "@/components/chat/LogoutConfirmModal";
import { DeleteConversationModal } from "@/components/chat/DeleteConversationModal";
import {
  fetchNotifications,
  markNotificationRead,
} from "@/services/notifications";
import { Avatar } from "@/components/Avatar";
import {
  BellIcon,
  ClipboardListIcon,
  CloseIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquareIcon,
  MessageSquarePlusIcon,
  ShoppingCartIcon,
  TrashIcon,
} from "@/components/icons/hero";
// The sign-in prompt's own illustration stays on the original duotone set,
// per explicit request — every icon on this page moved to Heroicons except
// this one.
import { MessageSquareIllustration } from "@/components/icons";
import { cn } from "@/lib/utils";
import { getInitial } from "@/lib/initials";
import type { SearchConversationList } from "@/types/search";

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
  "flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200/50 hover:text-ink";

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
  // A button, not a Link, since 2026-09-11 — these rows are exactly
  // the "vendor dashboard" navigation-progress treatment the /chat tree
  // adopted: prefetch the destination page's own data (with the top
  // progress bar showing it happening) and only push once it's resolved, so
  // Notifications/Requests land already rendered instead of showing
  // their own loading state a beat after arriving.
  const { navigate } = useNavigation();
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate();
        navigate(href);
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        MENU_ROW_CLASS,
        "cursor-pointer",
        active && "border-gray-200 bg-surface text-ink",
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
    </button>
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
  const { navigate } = useNavigation();

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
  // A vendor browsing /chat is already an authenticated person on this
  // platform, even on a browser with no linked buyer cookie (see
  // IdentitySessionSync / the "Linked identities" note in CLAUDE.md — most
  // vendors never link one at all). Read here so the sign-in prompt below
  // only ever targets a genuine guest, never someone who's already logged
  // in as a vendor and simply hasn't started a chat yet.
  const vendor = useUserStore((s) => s.user);
  // Either identity counts as "signed in" for the parts of this sidebar
  // that aren't buyer-specific (the Menu heading, the Notifications row —
  // notificationSession() on the backend already resolves either cookie —
  // and the account footer). Buyer-owned surfaces (conversations, Your
  // requests, Shopping Lists) still gate on `buyer` alone below, since
  // those collections are keyed to a Buyer document a vendor-only session
  // has no claim on.
  const identity = buyer ?? vendor ?? null;
  const pathname = usePathname();

  // Mobile only in effect: on desktop the slide-over flag is already false
  // and setting it again changes nothing, so one handler covers both.
  const closeOnMobile = () => setOpen(false);

  // Fetched whenever either identity exists — unlike the drawer this
  // replaced, the sidebar is VISIBLE by default on desktop, so gating the
  // query on "open" would leave a permanently empty column. Widened from
  // buyer-only to `identity` (2026-09-17): /api/search/conversations now
  // resolves a vendor session too (see that route's own comment), so a
  // vendor with no linked buyer account gets their own history instead of
  // this query staying permanently disabled for them. Still gated on
  // SOME identity: the endpoint 401s for an anonymous caller by design, and
  // most traffic here is still anonymous.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["buyer", "conversations"],
    queryFn: () =>
      buyerApi.get<SearchConversationList>("/api/search/conversations"),
    enabled: Boolean(identity),
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
    // Either identity, not just `buyer` — /api/notifications resolves
    // whichever cookie is present (notificationSession() on the backend),
    // so a vendor with no linked buyer still has real notifications to show.
    enabled: Boolean(identity),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadCount = notificationData?.unreadCount ?? 0;
  const queryClient = useQueryClient();

  // Shopping Lists (2026-09-12) — a toast on completion, in ADDITION to the
  // bell above (which already updates from this same 60s poll, no extra
  // request needed). Reuses that poll rather than starting a second one —
  // see this file's own comment on why one poll already covers "the buyer
  // is in a different conversation than the one that started the search".
  //
  // `toastedRef` guards against re-firing the same toast on every refetch —
  // this effect re-runs whenever notificationData changes, which happens
  // every 60s regardless of whether anything new arrived.
  //
  // `duration: Infinity` (2026-09-12, explicit request) — a search this
  // buyer waited on shouldn't vanish off-screen if they're away from the
  // tab when it lands; it stays up until they act on it. The action
  // (`View`) is the only dismissal, and it does double duty: navigate AND
  // mark read, same as clicking the row in the bell's own list, so the
  // unread badge doesn't keep counting a toast the buyer already acted on.
  const toastedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const n of notificationData?.notifications ?? []) {
      if (n.type !== "shopping-list" || n.read) continue;
      if (toastedRef.current.has(n.id)) continue;
      toastedRef.current.add(n.id);
      const toastId = toast.success(n.title, {
        description: n.body,
        duration: Infinity,
        action: n.href
          ? {
              label: "View",
              onClick: () => {
                markNotificationRead(n.id).catch(() => {});
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
                toast.dismiss(toastId);
                // navigate(), not router.push — the same prefetch-then-push
                // convention the sidebar's own menu rows use (see MenuRow's
                // header comment), so the destination lands already
                // rendered instead of showing its own loading state.
                navigate(n.href!);
              },
            }
          : undefined,
      });
    }
  }, [notificationData, navigate, queryClient]);

  // Delete-from-sidebar (2026-09-09). A confirm step first — same reasoning
  // as DeleteConversationModal's own comment: unlike logout, this is
  // genuinely irreversible. `deleteTarget` carries the title too, so the
  // modal can name exactly which thread it's about to remove.
  const activeConversationId = useChatHistoryStore(
    (s) => s.activeConversationId,
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => buyerApi.del(`/api/search/conversations/${id}`),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: ["buyer", "conversations"],
      });
      // The deleted thread was the one on screen — leave it showing a
      // conversation that no longer exists is worse than resetting to a
      // fresh chat the buyer didn't explicitly ask to start.
      if (activeConversationId === id) startNewChat();
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Couldn't delete that conversation — try again.");
    },
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
          // Literal black, not a themed gray: `gray-900` is the reversed
          // ramp's LIGHTEST shade in dark mode (see globals.css), which
          // would turn this dimming scrim into a LIGHTENING one behind the
          // mobile sidebar. A scrim's job (darken what's behind it) doesn't
          // change with the theme, so it can't be themed the same way text
          // and surfaces are.
          "fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        aria-label="Your conversations"
        style={{ width: SIDEBAR_WIDTH }}
        className={cn(
          // Mobile: an overlay pinned to the left edge, driven by isOpen.
          "fixed inset-y-0 left-0 z-50 shrink-0 bg-canvas border-r border-gray-100 flex flex-col transition-transform duration-200 ease-out",
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
              {identity ? "Menu" : "Your chats"}
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

          {/* The credit meter's mobile home (2026-09-12) — see
              CreditsSidebarMeter's own header comment. OUTSIDE the `buyer &&`
              gate below on purpose: a signed-out guest is exactly who most
              needs to see a balance draining, and the meter itself already
              renders `lg:hidden` so desktop (which has CreditsFab) never
              shows a second one. */}
          <CreditsSidebarMeter />

          {/* Section one — the app's surfaces that aren't a conversation.
              Signed-in only (either identity), per the note at the top of
              this file. Requests and Shopping Lists stay buyer-only inside
              it — Buyer Requests are keyed to a Buyer document with a
              phone-verified number, which a vendor-only session has no claim
              on — but Notifications and Shopping Lists both work for either
              identity (2026-09-17: Shopping Lists' ownership was widened the
              same way, per explicit product direction — "what buyer can do,
              vendor can do"), so neither is gated a second time here. */}
          {identity && (
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
                {buyer && (
                  <MenuLink
                    href="/chat/requests"
                    icon={<ClipboardListIcon size={19} className="shrink-0" />}
                    label="Your requests"
                    active={pathname === "/chat/requests"}
                    onNavigate={closeOnMobile}
                  />
                )}
                <MenuLink
                  href="/chat/shopping-list"
                  icon={<ShoppingCartIcon size={19} className="shrink-0" />}
                  label="Shopping Lists"
                  active={pathname === "/chat/shopping-list"}
                  onNavigate={closeOnMobile}
                />
                {/* The credit meter briefly sat here as a third row
                    (2026-09-01), then moved to the header, then to the
                    composer — see CreditsSidebarMeter's own header comment
                    for the full history. It's back in this sidebar again
                    (2026-09-12), but ABOVE this buyer-gated nav, not in it —
                    a guest with no buyer cookie needs to see it too. */}
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
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface border border-gray-200 hover:border-orange-200 hover:bg-orange-50/40 transition-colors cursor-pointer"
            >
              <MessageSquarePlusIcon size={19} className="text-orange-500" />
              <span className="text-sm font-medium text-ink">New chat</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {!identity ? (
              // The signed-out state IS the sign-in prompt — a history is
              // the one thing an account actually buys the buyer, so this
              // is the honest place to ask for one rather than a banner
              // over the thread. Gated on vendor too: a logged-in vendor
              // with no linked buyer account is not a guest, and offering
              // them "Continue with Google" reads as though they were never
              // signed in at all. They fall through to the query below,
              // which is disabled without a buyer cookie and so lands
              // harmlessly on the ordinary "Nothing here yet" empty state.
              <div className="flex flex-col items-center text-center gap-4 px-5 py-10">
                <MessageSquareIllustration size={64} />
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-ink">
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
                  <li key={c.conversationId} className="group relative">
                    <button
                      type="button"
                      onClick={() => openConversation(c.conversationId)}
                      className="w-full text-left pl-3 pr-9 py-2.5 rounded-xl hover:bg-gray-200/50 transition-colors cursor-pointer"
                    >
                      <span className="flex items-start gap-2.5">
                        <MessageSquareIcon
                          size={16}
                          className="text-gray-300 group-hover:text-orange-400 shrink-0 mt-0.5 transition-colors"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-ink truncate">
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
                          </span>
                        </span>
                      </span>
                    </button>
                    {/* Not hover-gated (no opacity-0/group-hover reveal) —
                        this app is mobile-first, and a hover-only affordance
                        is simply unreachable on a phone. Subdued by default,
                        a real "danger" color only once actually touched. */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({
                          id: c.conversationId,
                          title: c.title,
                        });
                      }}
                      aria-label={`Delete "${c.title}"`}
                      className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-colors hover:bg-red-100 hover:text-red-500 cursor-pointer"
                    >
                      <TrashIcon size={15} />
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
          {/* Appearance sits OUTSIDE the `buyer &&` gate above, deliberately
              (2026-09-10): a signed-out visitor reading /chat is looking at
              the same dark or light app as anyone else, and a theme control
              they can only reach by signing in is a theme control they can't
              reach. `compact` drops the labels on the narrowest phones, where
              this shares a cramped column. */}
          <div className="mt-auto border-t border-gray-200/70 px-3 py-3 shrink-0">
            <ThemeToggle compact className="w-full justify-between" />
          </div>

          {identity && (
            <AccountFooter
              name={
                buyer
                  ? (buyer.name ?? buyer.email ?? "Account")
                  : (vendor?.company?.name ?? vendor?.name ?? "Account")
              }
              avatar={(buyer ? buyer.avatar : vendor?.avatar) ?? undefined}
            />
          )}
        </div>
      </aside>

      {deleteTarget && (
        <DeleteConversationModal
          title={deleteTarget.title}
          busy={deleteMutation.isPending}
          onClose={() => {
            if (!deleteMutation.isPending) setDeleteTarget(null);
          }}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      )}
    </>
  );
}

// Generalised from BuyerAccountFooter (2026-09-17) to cover either identity —
// a vendor with no linked buyer account reaches this footer just as much as
// a signed-in buyer does (see ConversationSidebar's own `identity` note), and
// both display the same way: an avatar, a name, and one "Log out" that signs
// out whichever sessions actually exist (useAccountSignOut already handles
// both at once).
function AccountFooter({ name, avatar }: { name: string; avatar?: string }) {
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
        <Avatar src={avatar} label={getInitial(name)} className="h-7 w-7" />
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{name}</span>
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
