"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchNotifications } from "@/services/notifications";
import { useNotificationsStore } from "@/store/notificationsStore";

/**
 * Keeps the notification store in sync with the backend feed. Mounted app-wide
 * (see app/[id]/layout.tsx), so this runs continuously for every open dashboard
 * session — real delivery is push (see the service-worker message listener
 * below, which invalidates immediately on a live push) and web-push covers the
 * app-closed case; this poll only exists as a backstop for a missed/delayed
 * push. Widened from 45s to 120s (2026-07-31) to cut Vercel function
 * invocations — worth keeping in mind if it's ever tightened back down that
 * every session running this continuously, all day, is the cost. Also
 * refetches on window focus. `upsertNotifications` only ADDS unseen ids, so a
 * poll never clobbers an optimistic local read.
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
  // it receives. Refetch immediately so the bell updates the moment an event
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
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId || !data) return;
    upsertNotifications(data.notifications);
    if (seededForUserId !== userId) setSeededForUser(userId);
  }, [userId, data, upsertNotifications, setSeededForUser, seededForUserId]);
}
