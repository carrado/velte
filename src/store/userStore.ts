// stores/userStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware"; // optional: persist to localStorage

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
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updatedFields: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

export const useUserStore = create<UserStore>()(
  // Optional: persist to localStorage
  persist(
    (set) => ({
      users: [],
      setUsers: (users) => set({ users }),
      addUser: (user) => set((state) => ({ users: [...state.users, user] })),
      updateUser: (id, updatedFields) =>
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id ? { ...user, ...updatedFields } : user,
          ),
        })),
      deleteUser: (id) =>
        set((state) => ({
          users: state.users.filter((user) => user.id !== id),
        })),
    }),
    {
      name: "user-storage", // key in localStorage
    },
  ),
);
