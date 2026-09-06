"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

import {
  BellIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  CloseIcon,
  TagIcon,
  WalletIcon,
} from "@/components/icons";
import { BellIllustration } from "@/components/icons";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/notification";

// The notification feed, for whoever is signed in (2026-09-05).
//
// Buyers had no in-app notifications at all until buyer requests gave them
// something to be told about. This is where those land — and where a vendor
// browsing /chat sees theirs too, since the API is owner-keyed rather than
// vendor-only now.
//
// Under /chat rather than at the root, and reached from the sidebar MENU
// rather than a header bell (per explicit direction). A bell in the header
// competes with the credit meter for the same corner, and this is a place you
// visit rather than something you glance at.
//
// The page is deliberately richer than a list of rows, because a notification
// feed with no structure is one people stop opening: grouped by day, filtered
// by what kind of thing happened, unread state carried visually, and each row
// clickable through to the thing it is about.

const TYPE_STYLE: Record<
  NotificationType,
  { label: string; icon: React.ReactNode; ring: string; tint: string }
> = {
  "buyer-request": {
    label: "Request",
    icon: <ClipboardListIcon size={15} />,
    ring: "bg-sky-50 text-sky-600",
    tint: "group-hover:border-sky-200",
  },
  lead: {
    label: "Lead",
    icon: <ClipboardListIcon size={15} />,
    ring: "bg-emerald-50 text-emerald-600",
    tint: "group-hover:border-emerald-200",
  },
  order: {
    label: "Order",
    icon: <ClipboardListIcon size={15} />,
    ring: "bg-emerald-50 text-emerald-600",
    tint: "group-hover:border-emerald-200",
  },
  wallet: {
    label: "Wallet",
    icon: <WalletIcon size={15} />,
    ring: "bg-violet-50 text-violet-600",
    tint: "group-hover:border-violet-200",
  },
  payment: {
    label: "Payment",
    icon: <WalletIcon size={15} />,
    ring: "bg-violet-50 text-violet-600",
    tint: "group-hover:border-violet-200",
  },
  referral: {
    label: "Referral",
    icon: <CheckCircleIcon size={15} />,
    ring: "bg-amber-50 text-amber-600",
    tint: "group-hover:border-amber-200",
  },
  product: {
    label: "Product",
    icon: <TagIcon size={15} />,
    ring: "bg-gray-100 text-gray-600",
    tint: "group-hover:border-gray-300",
  },
  system: {
    label: "Velte",
    icon: <BellIcon size={15} />,
    ring: "bg-gray-100 text-gray-600",
    tint: "group-hover:border-gray-300",
  },
};

/** Day buckets, because a flat list of 40 rows reads as noise.
 *
 *  "Today"/"Yesterday" rather than dates for the recent ones: those are the
 *  two a reader locates by feel, and a date forces them to work it out. */
function dayLabel(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "Earlier";
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(then)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  return then.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year:
      then.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function timeLabel(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const minutes = Math.round((Date.now() - then.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return then.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationRow({
  notification,
  onRead,
  onDelete,
  deleting,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const style = TYPE_STYLE[notification.type] ?? TYPE_STYLE.system;
  const unread = !notification.read;

  const inner = (
    <>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          style.ring,
        )}
      >
        {style.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "truncate text-sm text-[#023337]",
              // Weight, not colour, carries unread — colour alone would be
              // the only signal for anyone who can't distinguish it, and the
              // dot below is the redundant second cue.
              unread ? "font-bold" : "font-medium",
            )}
          >
            {notification.title}
          </span>
          <span className="ml-auto shrink-0 text-[11px] text-gray-400">
            {timeLabel(notification.createdAt)}
          </span>
        </span>
        <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">
          {notification.body}
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {style.label}
          </span>
          {unread && (
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          )}
        </span>
      </span>
    </>
  );

  const rowClass = cn(
    "group flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
    unread ? "border-orange-100 bg-orange-50/40" : "border-gray-100 bg-white",
    style.tint,
    deleting && "opacity-50",
  );

  return (
    <li className="relative">
      {notification.href ? (
        // A notification with a destination is a link, so it opens in a new
        // tab on a middle-click and shows its target on hover — the ordinary
        // affordances a <button> would quietly remove.
        <Link
          href={notification.href}
          onClick={() => unread && onRead(notification.id)}
          className={rowClass}
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => unread && onRead(notification.id)}
          className={cn(rowClass, "cursor-pointer")}
        >
          {inner}
        </button>
      )}

      {/* Sits outside the link so a dismiss can never be a navigation.
          Visible on hover on a mouse, always on touch — where there is no
          hover to reveal it and a hidden control is simply an absent one. */}
      <button
        type="button"
        onClick={() => onDelete(notification.id)}
        disabled={deleting}
        aria-label="Remove notification"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 opacity-100 transition-colors hover:bg-white hover:text-gray-600 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
      >
        <CloseIcon size={13} />
      </button>
    </li>
  );
}

export function NotificationsPage() {
  const buyer = useBuyerStore((s) => s.buyer);
  const vendor = useUserStore((s) => s.user);
  const signedIn = Boolean(buyer || vendor);
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: signedIn,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
    // Silent on failure, deliberately: marking something read is incidental
    // to what the buyer was doing (opening the thing), and a toast about it
    // would be louder than the action.
  });

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't mark those as read. Try again."),
  });

  const remove = useMutation({
    mutationFn: deleteNotification,
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't remove that. Try again."),
  });

  const all = useMemo(() => data?.notifications ?? [], [data]);
  const unreadCount = data?.unreadCount ?? 0;

  const visible = useMemo(
    () => (filter === "unread" ? all.filter((n) => !n.read) : all),
    [all, filter],
  );

  // Grouped in render order, not sorted here — the API already returns
  // newest-first, and re-sorting would be a second opinion about ordering
  // that could silently disagree with it.
  const groups = useMemo(() => {
    const out: { label: string; items: AppNotification[] }[] = [];
    for (const n of visible) {
      const label = dayLabel(n.createdAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(n);
      else out.push({ label, items: [n] });
    }
    return out;
  }, [visible]);

  if (!signedIn) {
    return (
      // Its own scroller: the chat shell hands its children a fixed-height
      // box, so a page that doesn't scroll itself is clipped at the fold.
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <BellIcon size={28} className="mx-auto text-gray-300" />
          <h1 className="mt-4 text-lg font-bold text-[#023337]">
            Sign in to see your notifications
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Velte tells you here when a business answers your request.
          </p>
          <div className="mt-6 flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-bold text-[#023337]">
                Notifications
                {unreadCount > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Price drops, and answers to your requests.
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => readAll.mutate()}
                disabled={readAll.isPending}
                className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Only offered once there is something to filter FROM. Two tabs
              over an empty list is chrome pretending to be a feature. */}
          {all.length > 0 && (
            <div className="mt-4 inline-flex rounded-full bg-gray-100 p-1">
              {(["all", "unread"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer",
                    filter === key
                      ? "bg-white text-[#023337] shadow-sm"
                      : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  {key}
                  {key === "unread" && unreadCount > 0 && ` (${unreadCount})`}
                </button>
              ))}
            </div>
          )}
        </header>

        {isLoading && (
          <ul className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
              />
            ))}
          </ul>
        )}

        {isError && (
          <p className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500">
            Couldn&apos;t load your notifications just now. Refresh to try
            again.
          </p>
        )}

        {!isLoading && !isError && visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            {/* The illustration set, not a UI icon — empty states are exactly
                what it is reserved for (see the icons note in CLAUDE.md). */}
            <BellIllustration size={56} className="mx-auto" />
            <p className="mt-4 text-sm font-semibold text-[#023337]">
              {filter === "unread" ? "Nothing unread" : "No notifications yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              {filter === "unread"
                ? "You're all caught up."
                : "When a business answers your request, it'll show up here."}
            </p>
            {filter === "all" && (
              <Link
                href="/chat"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Start a new search
              </Link>
            )}
          </div>
        )}

        {groups.map((group) => (
          <section key={group.label} className="mb-6">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {group.label}
            </h2>
            <ul className="space-y-2">
              {group.items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onRead={(id) => read.mutate(id)}
                  onDelete={(id) => remove.mutate(id)}
                  deleting={remove.isPending && remove.variables === n.id}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
