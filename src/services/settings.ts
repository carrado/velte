import { apiClient } from "@/lib/api";
import { useUserStore } from "@/store/userStore";
import type {
  User,
  UserNotifications,
  UserCompany,
  UserPreferences,
} from "@/types/user";

export type { UserNotifications };

export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  avatar?: string;
}

export interface RequestPasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ConfirmPasswordChangeData {
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

function mapRawUser(u: Record<string, unknown>): User {
  return {
    id: ((u.id ?? u._id) as string) ?? "",
    name: (u.name as string) ?? "",
    email: (u.email as string) ?? "",
    country: (u.country as string) ?? "",
    username: (u.username as string) ?? "",
    phone: (u.phone as string) ?? undefined,
    avatar: (u.avatar as string) ?? undefined,
    company: (u.company as UserCompany) ?? undefined,
    preferences: (u.preferences as UserPreferences) ?? undefined,
    onboarding: (u.onboarding as boolean) ?? false,
  };
}

export const settingsApi = {
  fetchProfile: async (): Promise<User> => {
    const response = await apiClient<{
      success: true;
      user: Record<string, unknown>;
    }>("/auth/me");
    const user = mapRawUser(response.user);
    useUserStore.getState().setUser(user);
    return user;
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const response = await apiClient<{
      success: true;
      user: Record<string, unknown>;
    }>("/auth/profile", {
      method: "PUT",
      data,
    });
    const user = mapRawUser(response.user);
    useUserStore.getState().updateUser(user);
    return user;
  },

  requestPasswordChange: async (
    data: RequestPasswordChangeData,
  ): Promise<{ message: string }> => {
    return apiClient<{ success: true; message: string }>(
      "/auth/change-password/request",
      {
        method: "POST",
        data,
      },
    );
  },

  confirmPasswordChange: async (
    data: ConfirmPasswordChangeData,
  ): Promise<{ message: string }> => {
    return apiClient<{ success: true; message: string }>(
      "/auth/change-password/confirm",
      {
        method: "POST",
        data,
      },
    );
  },

  getNotificationSettings: async (): Promise<UserNotifications> => {
    const response = await apiClient<{
      success: true;
      notifications: UserNotifications;
    }>("/auth/notifications");
    return response.notifications;
  },

  saveNotificationSettings: async (
    data: Partial<UserNotifications>,
  ): Promise<UserNotifications> => {
    const response = await apiClient<{
      success: true;
      notifications: UserNotifications;
    }>("/auth/notifications", {
      method: "PUT",
      data,
    });
    return response.notifications;
  },
};
