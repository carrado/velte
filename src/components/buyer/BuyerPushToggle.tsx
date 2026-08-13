"use client";

import { Bell, BellOff } from "lucide-react";
import { useBuyerPushNotifications } from "@/hooks/useBuyerPushNotifications";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/* A persistent, settings-page control — same row shape as the vendor
 * dashboard's own PushNotificationToggle (Settings), not a copy of it.
 * Exists precisely so a buyer isn't dependent on ever seeing (or not
 * dismissing) BuyerNotificationBell's inline opt-in row — this is always
 * reachable from Profile regardless of whether that ever showed. */
export function BuyerPushToggle() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = useBuyerPushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2.5 text-dash-body text-gray-400">
        <BellOff size={16} className="shrink-0" />
        <span>Push notifications aren&apos;t supported in this browser.</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-4 py-3 text-dash-body text-gray-500 ring-1 ring-gray-100">
        <BellOff size={16} className="shrink-0 text-gray-400" />
        <span>
          Notifications are blocked.{" "}
          <span className="font-medium text-gray-700">
            Re-enable them in your browser settings.
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          isSubscribed ? "bg-orange-50" : "bg-gray-100",
        )}
      >
        <Bell
          size={15}
          className={isSubscribed ? "text-orange-500" : "text-gray-400"}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-dash-body font-medium text-gray-900">
          Push notifications
        </p>
        <p className="text-dash-caption text-gray-400 truncate">
          {isSubscribed
            ? "You'll get alerts even when Velte is closed."
            : "Get notified the moment something changes."}
        </p>
      </div>
      <Switch
        checked={isSubscribed}
        onCheckedChange={(checked) => (checked ? subscribe() : unsubscribe())}
        disabled={isLoading}
        aria-label="Push notifications"
        className="shrink-0"
      />
    </div>
  );
}
