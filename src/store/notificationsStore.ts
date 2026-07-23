import { create } from "zustand";
import type { AppNotification } from "@/types/notification";

interface NotificationsState {
  notifications: AppNotification[];
  seededForUserId: string | null;
  upsertNotifications: (incoming: AppNotification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  setSeededForUser: (userId: string) => void;
  clearNotifications: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  notifications: [],
  seededForUserId: null,
  upsertNotifications: (incoming) =>
    set((state) => {
      const byId = new Map(state.notifications.map((n) => [n.id, n]));
      for (const n of incoming) {
        if (!byId.has(n.id)) byId.set(n.id, n);
      }
      return { notifications: Array.from(byId.values()) };
    }),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  setSeededForUser: (userId) => set({ seededForUserId: userId }),
  clearNotifications: () => set({ notifications: [], seededForUserId: null }),
}));
