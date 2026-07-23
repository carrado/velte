import { api } from "@/lib/api-client";
import type { AppNotification } from "@/types/notification";

/* Client service for the notification feed. Calls the BFF routes, which proxy the
   upstream backend and own auth + shape. */

export interface NotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
}

export function fetchNotifications(): Promise<NotificationsResult> {
  return api.get<NotificationsResult>("/api/notifications");
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/api/notifications/read-all");
}

export async function deleteNotification(id: string): Promise<void> {
  await api.del(`/api/notifications/${id}`);
}
