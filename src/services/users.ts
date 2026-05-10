// services/users.ts
import { apiClient } from "@/lib/api";
import { useUserStore } from "@/store/userStore";
import type { User } from "@/types/user";

export const usersApi = {
  // GET a single user (optional: update store if needed)
  getOne: async (id: string) => {
    const response = await apiClient(`/users/${id}`);
    return response;
  },

  // POST (create) – API call
  create: async (data: Record<string, unknown>) => {
    const response = await apiClient("/auth/register", {
      method: "POST",
      data,
    });
    return response;
  },

  // POST (login) – API call, then add to store
  login: async (data: Record<string, unknown>) => {
    const response = await apiClient<{ user: User }>("/auth/login", {
      method: "POST",
      data,
    });
    useUserStore.getState().setUser(response.user);
    return response;
  },

  logout: async () => {
    const data: Record<string, never> = {};
    const response = await apiClient("/auth/logout", { method: "POST", data });
    useUserStore.getState().clearUser();
    return response;
  },

  verify: async (data: Record<string, unknown>) => {
    const response = await apiClient("/auth/verify", { method: "POST", data });
    return response;
  },

  // PATCH (update) – API call, then update store
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient<{ user: Partial<User> }>(`/users/${id}`, {
      method: "PATCH",
      data,
    });
    useUserStore.getState().updateUser(response.user);
    return response;
  },

  // DELETE – API call, then remove from store
  delete: async (id: string) => {
    await apiClient(`/users/${id}`, { method: "DELETE" });
    const { user, clearUser } = useUserStore.getState();
    if (user?.id === id) clearUser();
  },

  test: async () => {
    const response = await apiClient("/auth/me");
    return response;
  },
};
