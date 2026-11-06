"use client";

import { NotificationList } from "@/components/notifications/NotificationList";

export default function NotificationsPage() {
  return (
    <div className="bg-surface rounded-xl overflow-hidden -mx-5 sm:mx-0">
      <NotificationList />
    </div>
  );
}
