"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationsStore } from "@/store/notificationsStore";
import { NotificationList } from "./NotificationList";

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
        className="relative text-[#6B7280] hover:text-[#111827] cursor-pointer focus:outline-none"
        aria-label="Open notifications"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
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
