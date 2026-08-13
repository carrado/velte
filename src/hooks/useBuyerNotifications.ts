"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import type { BuyerNotification } from "@/types/buyerNotification";

interface NotificationsResponse {
  notifications: BuyerNotification[];
  unreadCount: number;
}

const QUERY_KEY = ["buyer-notifications"];

/* Buyers now have real push (see useBuyerPushNotifications + buyerNotification
 * .service.js's own comment) — the shared service worker (src/app/api/sw/
 * route.ts) posts "velte-push" to every open tab the instant a push lands,
 * same signal the vendor Header's NotificationDropdown already reacts to.
 * This still keeps the 60s poll as a backstop for a buyer who never enabled
 * push (or a missed/delayed one), same "push for real-time, poll as
 * fallback" split the vendor side uses — this just doesn't need a separate
 * Zustand sync store to get there, one query + two mutations is enough. */
export function useBuyerNotifications() {
  const { buyer } = useBuyerSession();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () =>
      buyerApi.get<NotificationsResponse>("/api/buyer-notifications"),
    enabled: !!buyer,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
    retry: false,
  });

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "velte-push") {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      buyerApi.patch(`/api/buyer-notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => buyerApi.patch("/api/buyer-notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading: isLoading && !!buyer,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
  };
}
