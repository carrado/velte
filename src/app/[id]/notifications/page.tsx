"use client";

import { NotificationList } from "@/components/notifications/NotificationList";

export default function NotificationsPage() {
  return (
    <div className="bg-white rounded-xl overflow-hidden -mx-5 sm:mx-0">
      <NotificationList />
    </div>
  );
}
