"use client";

import { useRef, useState } from "react";
import {
  Bell,
  Check,
  CreditCard,
  Package,
  ShoppingCart,
  Wallet,
  Gift,
  MessageCircle,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@/store/notificationsStore";
import { useNavigation } from "@/components/NavigationProgressContext";
import AnchoredPopover from "@/components/AnchoredPopover";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/services/notifications";
import type { AppNotification, NotificationType } from "@/types/notification";

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; bg: string; color: string }
> = {
  order: { icon: ShoppingCart, bg: "bg-blue-100", color: "text-blue-600" },
  product: { icon: Package, bg: "bg-orange-100", color: "text-orange-600" },
  payment: { icon: CreditCard, bg: "bg-green-100", color: "text-green-600" },
  wallet: { icon: Wallet, bg: "bg-amber-100", color: "text-amber-600" },
  referral: { icon: Gift, bg: "bg-orange-100", color: "text-orange-600" },
  lead: { icon: MessageCircle, bg: "bg-green-100", color: "text-green-600" },
  system: { icon: Bell, bg: "bg-gray-100", color: "text-gray-500" },
};

function NotificationItem({
  notification,
  onClose,
}: {
  notification: AppNotification;
  onClose?: () => void;
}) {
  const { markAsRead, removeNotification } = useNotificationsStore();
  const { navigate } = useNavigation();
  const { icon: Icon, bg, color } = TYPE_CONFIG[notification.type];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    if (!notification.read) {
      markAsRead(notification.id); // optimistic
      markNotificationRead(notification.id).catch(() => {}); // persist
    }
    onClose?.();
    if (notification.href) navigate(notification.href);
  }

  function handleMarkAsRead() {
    setMenuOpen(false);
    markAsRead(notification.id); // optimistic
    markNotificationRead(notification.id).catch(() => {}); // persist
  }

  function handleDelete() {
    setMenuOpen(false);
    removeNotification(notification.id); // optimistic
    deleteNotification(notification.id).catch(() => {}); // persist
  }

  return (
    <div
      className={cn(
        "flex items-start gap-1 px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors",
        !notification.read && "bg-orange-50/70 hover:bg-orange-50",
      )}
    >
      <button
        onClick={handleClick}
        className="flex-1 flex items-start gap-3 min-w-0 text-left cursor-pointer"
      >
        <div
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5",
            bg,
          )}
        >
          <Icon size={15} className={color} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm leading-snug",
              notification.read
                ? "text-gray-500 font-normal"
                : "text-gray-900 font-semibold",
            )}
          >
            {notification.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
            {notification.body}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {formatDate(notification.createdAt)}
          </p>
        </div>
        {!notification.read && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
        )}
      </button>

      {/* Sibling button, not nested inside the row's own button above
          (invalid HTML, and would also fire the row's click) — same
          AnchoredPopover pattern ProductActionsPopover uses, since this row
          sits inside a scrollable list (max-h + overflow-y-auto) that would
          clip a plain absolutely-positioned dropdown. */}
      <button
        ref={menuTriggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        aria-label="Notification actions"
        className="flex-shrink-0 mt-0.5 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
      >
        <MoreHorizontal size={16} />
      </button>
      <AnchoredPopover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={menuTriggerRef}
        align="auto"
        className="w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1"
      >
        {!notification.read && (
          <button
            onClick={handleMarkAsRead}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors cursor-pointer"
          >
            <Check size={14} className="text-green-500" />
            Mark as read
          </button>
        )}
        <button
          onClick={handleDelete}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 size={14} className="text-red-400" />
          Delete
        </button>
      </AnchoredPopover>
    </div>
  );
}

interface NotificationListProps {
  onClose?: () => void;
  className?: string;
}

export function NotificationList({
  onClose,
  className,
}: NotificationListProps) {
  const { notifications, markAllAsRead } = useNotificationsStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleMarkAllRead() {
    markAllAsRead(); // optimistic
    markAllNotificationsRead().catch(() => {}); // persist
  }

  const sorted = [...notifications].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-14 text-center px-4",
          className,
        )}
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Bell size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-500">No notifications</p>
        <p className="text-xs text-gray-400 mt-1">You&apos;re all caught up!</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col px-3 sm:px-0", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>
      <div>
        {sorted.map((n) => (
          <NotificationItem key={n.id} notification={n} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}
