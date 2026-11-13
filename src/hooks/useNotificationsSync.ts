"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchNotifications } from "@/services/notifications";
import { useNotificationsStore } from "@/store/notificationsStore";
import { sharedWsClient, type HubWsClientMessage } from "@/lib/wsClient";

/**
 * Keeps the notification store in sync with the backend feed in real time.
 * Uses the shared WebSocket connection for instant detection of new
 * notifications (`NEW_NOTIFICATIONS`, `NOTIFICATIONS_SYNC`) and falls back to
 * 120s polling only when WebSocket is disconnected. Also listens to service
 * worker push messages ("velte-push") for background arrival.
 */
export function useNotificationsSync(userId: string | undefined) {
  const upsertNotifications = useNotificationsStore(
    (s) => s.upsertNotifications,
  );
  const setSeededForUser = useNotificationsStore((s) => s.setSeededForUser);
  const seededForUserId = useNotificationsStore((s) => s.seededForUserId);
  const clearNotifications = useNotificationsStore((s) => s.clearNotifications);
  const queryClient = useQueryClient();
  const [wsConnected, setWsConnected] = useState(
    () => sharedWsClient.getStatus().isConnected,
  );

  // Real-time bell via Service Worker push fallback
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

  // Real-time bell via WebSocket
  useEffect(() => {
    if (!userId) return;

    const unsubStatus = sharedWsClient.subscribeStatus((connected) => {
      setWsConnected(connected);
    });

    sharedWsClient.registerUserSubscription({ userId });

    const unsubMsg = sharedWsClient.subscribe((msg: HubWsClientMessage) => {
      if (
        msg.type === "NEW_NOTIFICATIONS" &&
        Array.isArray(msg.notifications) &&
        msg.notifications.length > 0
      ) {
        upsertNotifications(msg.notifications);
        if (Array.isArray(msg.allNotifications)) {
          queryClient.setQueryData(queryKeys.notifications.list, {
            notifications: msg.allNotifications,
            unreadCount:
              msg.unreadCount ??
              msg.allNotifications.filter((n) => !n.read).length,
          });
        } else {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.list,
          });
        }
      } else if (msg.type === "NOTIFICATIONS_SYNC") {
        if (Array.isArray(msg.allNotifications)) {
          queryClient.setQueryData(queryKeys.notifications.list, {
            notifications: msg.allNotifications,
            unreadCount:
              msg.unreadCount ??
              msg.allNotifications.filter((n) => !n.read).length,
          });
        } else {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.list,
          });
        }
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [userId, upsertNotifications, queryClient]);

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
    // Disable background polling when WebSocket is connected; fall back to 120s when offline
    refetchInterval: wsConnected ? false : 120_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId || !data) return;
    upsertNotifications(data.notifications);
    if (seededForUserId !== userId) setSeededForUser(userId);

    // Sync known IDs with WebSocket server so only unseen items push
    sharedWsClient.registerUserSubscription({
      userId,
      knownNotificationIds: data.notifications.map((n) => n.id),
    });
  }, [userId, data, upsertNotifications, setSeededForUser, seededForUserId]);
}
