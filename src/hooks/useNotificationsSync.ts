"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  // Real-time bell: the service worker postMessages "velte-push" on every push
  // it receives. Refetch immediately so the bell updates the moment an order
  // arrives, rather than on the next 45s poll. Falls back to the poll if the
  // tab was asleep when the message fired.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "velte-push") {
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.list,
        });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient]);

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
