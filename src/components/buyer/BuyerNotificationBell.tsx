"use client";

import { Bell, BellRing, ClipboardList, Store, Tag } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBuyerNotifications } from "@/hooks/useBuyerNotifications";
import { useBuyerPushNotifications } from "@/hooks/useBuyerPushNotifications";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import { timeAgo } from "@/lib/timeAgo";
import { cn } from "@/lib/utils";
import type {
  BuyerNotification,
  BuyerNotificationType,
} from "@/types/buyerNotification";

const ICONS: Record<BuyerNotificationType, React.ElementType> = {
  "request-response": ClipboardList,
  "saved-price-change": Tag,
  "followed-new-listing": Store,
  "followed-store-update": Store,
  system: Bell,
};

/* The buyer dashboard's own bell — in-app + push (see useBuyerPushNotifications'
 * own comment on why the opt-in here is deliberately just a plain inline
 * row, not the vendor Header's whole install-banner/battery-tip flow).
 * Covers all four buyer-facing triggers: a vendor responding to your
 * request, a saved item's price changing, and a followed vendor either
 * posting something new or updating their store. */
export function BuyerNotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useBuyerNotifications();
  const { navigate } = useBuyerNavigation();
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: subscribeToPush,
  } = useBuyerPushNotifications();

  function handleClick(n: BuyerNotification) {
    if (!n.read) markRead(n.id);
    if (n.href) navigate(n.href);
  }

  // Nothing to offer once subscribed, unsupported, or already denied
  // (re-enabling denied permission needs the browser's own settings, not a
  // button here — same reasoning as the vendor PushNotificationToggle's
  // denied-state copy).
  const showPushOptIn =
    pushSupported && pushPermission === "default" && !pushSubscribed;

  return (
    <Popover>
      {/* Explicit id — sidesteps Base UI's positional useId()-based id
          generation hydration-mismatching against anything earlier in the
          tree, same fix the vendor Header's own notification trigger
          uses. */}
      <PopoverTrigger
        id="buyer-header-notifications-trigger"
        aria-label="Notifications"
        className="relative text-gray-500 hover:text-gray-700 cursor-pointer focus:outline-none"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-[3px] flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[340px] p-0 rounded-xl border border-gray-200 shadow-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-dash-body font-semibold text-gray-900">
            Notifications
          </p>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-dash-caption font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>

        {showPushOptIn && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-orange-50/60 border-b border-orange-100">
            <BellRing size={15} className="text-orange-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-dash-caption text-gray-700">
                Turn on push notifications to hear about these the moment they
                happen, even with the app closed.
              </p>
              <button
                onClick={() => subscribeToPush()}
                disabled={pushLoading}
                className="mt-1.5 text-dash-caption font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-60 cursor-pointer"
              >
                {pushLoading ? "Enabling…" : "Enable push notifications"}
              </button>
            </div>
          </div>
        )}

        <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
          {notifications.length === 0 ? (
            <p className="text-dash-body text-gray-400 text-center py-10">
              Nothing yet.
            </p>
          ) : (
            notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer",
                    !n.read && "bg-orange-50/50",
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-dash-body font-medium text-gray-900 truncate">
                      {n.title}
                    </p>
                    <p className="text-dash-caption text-gray-500 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-dash-caption text-gray-400 mt-0.5">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
