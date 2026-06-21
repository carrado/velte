import { apiClient } from "@/lib/api";
import { useUserStore } from "@/store/userStore";
import type {
  User,
  UserNotifications,
  UserCompany,
  UserPreferences,
  BusinessType,
} from "@/types/user";
import type { InvoiceReceiptSettings } from "@/types/invoice";
import type { AiSettings } from "@/types/ai-settings";

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
    businessType: (u.businessType as BusinessType) ?? undefined,
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

  getInvoiceSettings: async (): Promise<InvoiceReceiptSettings> => {
    const response = await apiClient<{
      success: true;
      data: InvoiceReceiptSettings;
    }>("/auth/invoice-settings");
    return response.data;
  },

  // Accepts a partial document (the UI saves one tab — `invoice` or `receipt` —
  // at a time) and returns the full, merged settings.
  saveInvoiceSettings: async (
    data: Partial<InvoiceReceiptSettings>,
  ): Promise<InvoiceReceiptSettings> => {
    const response = await apiClient<{
      success: true;
      data: InvoiceReceiptSettings;
    }>("/auth/invoice-settings", {
      method: "PUT",
      data,
    });
    return response.data;
  },

  getAiSettings: async (): Promise<AiSettings> => {
    const response = await apiClient<{
      success: true;
      data: AiSettings;
    }>("/auth/ai-settings");
    return response.data;
  },

  saveAiSettings: async (data: Partial<AiSettings>): Promise<AiSettings> => {
    const response = await apiClient<{
      success: true;
      data: AiSettings;
    }>("/auth/ai-settings", {
      method: "PUT",
      data,
    });
    return response.data;
  },

  updateBusinessType: async (businessType: BusinessType): Promise<User> => {
    const response = await apiClient<{
      success: true;
      user: Record<string, unknown>;
    }>("/auth/business-type", {
      method: "PATCH",
      data: { businessType },
    });
    const user = mapRawUser(response.user);
    useUserStore.getState().updateUser(user);
    return user;
  },
};
