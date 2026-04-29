import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/user";

export type { User };

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),

      updateUser: (updatedFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        })),

      clearUser: () => set({ user: null }),
    }),
    {
      name: "user-storage",
      skipHydration: true,
    },
  ),
);
