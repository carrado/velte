import { create } from "zustand";
import type { User } from "@/types/user";

export type { User };

// A stable reference for selectors that need an array fallback (e.g.
// `s.user?.sectors ?? EMPTY_SECTORS`) — `?? []` allocates a new array on
// every read, which breaks Zustand/useSyncExternalStore's referential-equality
// check and causes an infinite render loop ("getServerSnapshot should be
// cached"). Never mutate this.
export const EMPTY_SECTORS: string[] = [];

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  updateUser: (updatedFields) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null,
    })),

  clearUser: () => set({ user: null }),
}));
