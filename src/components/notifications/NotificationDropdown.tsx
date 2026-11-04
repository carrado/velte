"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationsStore } from "@/store/notificationsStore";
import { NotificationList } from "./NotificationList";
import { BellIcon } from "@/components/icons/hero";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const notifications = useNotificationsStore((s) => s.notifications);
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Explicit id — sidesteps Base UI's positional useId()-based id
          generation, which produces a hydration mismatch whenever ANYTHING
          earlier in the tree calls useId() a different number of times on
          the server vs. the client's first render — unrelated to this
          component itself. See Header.tsx's matching fix for its own
          Popover trigger for the fuller explanation. */}
      <PopoverTrigger
        id="header-notifications-trigger"
        className="relative inline-flex items-center justify-center rounded-xl p-2 text-gray-600 hover:bg-gray-50 cursor-pointer focus:outline-none"
        aria-label="Open notifications"
      >
        <BellIcon size={18} />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-orange-500" />
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[360px] p-0 rounded-xl border border-gray-200 shadow-lg overflow-hidden"
      >
        <div className="max-h-[480px] overflow-y-auto">
          <NotificationList onClose={() => setOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
