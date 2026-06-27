"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchNotifications } from "@/services/notifications";
import { useNotificationsStore } from "@/store/notificationsStore";

/**
 * Keeps the notification store in sync with the backend feed. Polls every 45s (and
 * on window focus) so new orders surface on the bell while the dashboard is open;
 * web-push covers the app-closed case. `upsertNotifications` only ADDS unseen ids,
 * so a poll never clobbers an optimistic local read. Replaces the old client-side
 * seeder that derived notifications from an orders/products snapshot.
 */
export function useNotificationsSync(userId: string | undefined) {
  const upsertNotifications = useNotificationsStore(
    (s) => s.upsertNotifications,
  );
  const setSeededForUser = useNotificationsStore((s) => s.setSeededForUser);
  const seededForUserId = useNotificationsStore((s) => s.seededForUserId);
  const clearNotifications = useNotificationsStore((s) => s.clearNotifications);

  // Drop the previous user's notifications when the signed-in user changes.
  useEffect(() => {
    if (userId && seededForUserId && seededForUserId !== userId) {
      clearNotifications();
    }
  }, [userId, seededForUserId, clearNotifications]);

  const { data } = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: fetchNotifications,
    enabled: !!userId,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId || !data) return;
    upsertNotifications(data.notifications);
    if (seededForUserId !== userId) setSeededForUser(userId);
  }, [userId, data, upsertNotifications, setSeededForUser, seededForUserId]);
}
