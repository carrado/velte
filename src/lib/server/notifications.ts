import { backendFetch } from "./backend";
import type { AppNotification } from "@/types/notification";

/* Server data module for notifications. The upstream backend already returns the
   client-facing shape ({ id, type, title, body, read, href, createdAt }) plus an
   unread count, so these helpers stay thin — they just forward the session cookie
   and normalise the envelope. */

interface NotificationsPayload {
  notifications: AppNotification[];
  unreadCount: number;
}

export async function fetchNotifications(
  cookie: string,
): Promise<NotificationsPayload> {
  const body = await backendFetch<Partial<NotificationsPayload>>(
    "/notifications",
    { cookie },
  );
  return {
    notifications: Array.isArray(body.notifications) ? body.notifications : [],
    unreadCount: body.unreadCount ?? 0,
  };
}

export async function markNotificationRead(
  id: string,
  cookie: string,
): Promise<void> {
  await backendFetch(`/notifications/${id}/read`, { method: "PATCH", cookie });
}

export async function markAllNotificationsRead(cookie: string): Promise<void> {
  await backendFetch("/notifications/read-all", { method: "PATCH", cookie });
}
