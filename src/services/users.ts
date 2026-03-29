// services/users.ts
import { apiClient } from "@/lib/api";
import { useUserStore } from "@/store/userStore";

export const usersApi = {
  // GET all users – fetches from API and updates the store
  getAll: async () => {
    const response = await apiClient("/users");
    const users = response.users || response; // adjust based on API response shape
    useUserStore.getState().setUsers(users);
    return response;
  },

  // GET a single user (optional: update store if needed)
  getOne: async (id: string) => {
    const response = await apiClient(`/users/${id}`);
    return response;
  },

  // POST (create) – API call, then add to store
  create: async (data: any) => {
    const response = await apiClient("/auth/register", {
      method: "POST",
      data,
    });
    const newUser = { ...response.user };
    // Add to Zustand store
    useUserStore.getState().addUser(newUser);
    return response;
  },

  // POST (login) – API call, then add to store
  login: async (data: any) => {
    const response = await apiClient("/auth/login", { method: "POST", data });
    const newUser = { ...response.user };
    // Add to Zustand store
    useUserStore.getState().addUser(newUser);
    return response;
  },

  verify: async (data: any) => {
    const response = await apiClient("/auth/verify", { method: "POST", data });
    return response;
  },

  // PATCH (update) – API call, then update store
  update: async (id: string, data: any) => {
    const response = await apiClient(`/users/${id}`, { method: "PATCH", data });
    // Update store with the returned user data
    useUserStore.getState().updateUser(id, response.user);
    return response;
  },

  // DELETE – API call, then remove from store
  delete: async (id: string) => {
    await apiClient(`/users/${id}`, { method: "DELETE" });
    useUserStore.getState().deleteUser(id);
  },

  test: async () => {
    const response = await apiClient("/auth/me");
    return response;
  },
};
