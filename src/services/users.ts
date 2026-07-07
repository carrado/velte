// services/users.ts
import { api } from "@/lib/api-client";
import { useUserStore } from "@/store/userStore";
import type { User } from "@/types/user";

export const usersApi = {
  // GET a single user
  getOne: async (id: string) => {
    return api.get(`/api/users/${id}`);
  },

  // POST (create / register)
  create: async (data: Record<string, unknown>) => {
    return api.post("/api/auth/register", data);
  },

  // POST (login) – then add to store
  login: async (data: Record<string, unknown>) => {
    const result = await api.post<{ user: User }>("/api/auth/login", data);
    useUserStore.getState().setUser(result.user);
    return result;
  },

  logout: async () => {
    const result = await api.post("/api/auth/logout");
    useUserStore.getState().clearUser();
    return result;
  },

  verify: async (data: Record<string, unknown>) => {
    return api.post("/api/auth/verify", data);
  },

  updateProfile: async (data: {
    services?: string[];
    businessName?: string;
    address?: string;
  }) => {
    const result = await api.put<{ user: Partial<User> }>(
      "/api/auth/profile",
      data,
    );
    useUserStore.getState().updateUser(result.user);
    return result;
  },

  // PATCH (update) – then update store
  update: async (id: string, data: Record<string, unknown>) => {
    const result = await api.patch<{ user: Partial<User> }>(
      `/api/users/${id}`,
      data,
    );
    useUserStore.getState().updateUser(result.user);
    return result;
  },

  // DELETE – then remove from store
  delete: async (id: string) => {
    await api.del(`/api/users/${id}`);
    const { user, clearUser } = useUserStore.getState();
    if (user?.id === id) clearUser();
  },

  getMe: async () => {
    const { user } = await api.get<{ user: User }>("/api/auth/me");
    useUserStore.getState().setUser(user);
    return user;
  },

  // For public pages (e.g. the marketing Navbar) that must render fine for
  // a logged-out visitor — a plain `fetch`, not `api.get`, because api-client
  // treats any 401 as a session that needs recovering and force-redirects to
  // /auth/login, which would hijack anonymous visitors off the homepage.
  getMeSilent: async (): Promise<User | null> => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!res.ok) return null;
      const { user } = (await res.json()) as { user: User };
      useUserStore.getState().setUser(user);
      return user;
    } catch {
      return null;
    }
  },

  updateOnboarding: async () => {
    const user = useUserStore.getState().user;
    if (!user) return;
    await api.patch(`/api/users/${user.id}`, { onboarding: false });
    useUserStore.getState().updateUser({ onboarding: false });
  },
};
