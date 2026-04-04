// stores/userStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  country: string;
  username: string;
  businessName: string;
  address: string;
  services: string[];
}

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
      name: "user-storage", // persists user to localStorage
      skipHydration: true,
      // Optionally, only persist specific fields:
      // partialize: (state) => ({ user: state.user }),
    },
  ),
);
