import { api } from "@/lib/api-client";
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
    const { user: raw } = await api.get<{ user: Record<string, unknown> }>(
      "/api/auth/me",
    );
    const user = mapRawUser(raw);
    useUserStore.getState().setUser(user);
    return user;
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const { user: raw } = await api.put<{ user: Record<string, unknown> }>(
      "/api/auth/profile",
      data,
    );
    const user = mapRawUser(raw);
    useUserStore.getState().updateUser(user);
    return user;
  },

  requestPasswordChange: async (
    data: RequestPasswordChangeData,
  ): Promise<{ message: string }> => {
    const { message } = await api.post<{ message: string }>(
      "/api/auth/change-password/request",
      data,
    );
    return { message: message ?? "" };
  },

  confirmPasswordChange: async (
    data: ConfirmPasswordChangeData,
  ): Promise<{ message: string }> => {
    const { message } = await api.post<{ message: string }>(
      "/api/auth/change-password/confirm",
      data,
    );
    return { message: message ?? "" };
  },

  getNotificationSettings: async (): Promise<UserNotifications> => {
    const { notifications } = await api.get<{
      notifications: UserNotifications;
    }>("/api/auth/notifications");
    return notifications;
  },

  saveNotificationSettings: async (
    data: Partial<UserNotifications>,
  ): Promise<UserNotifications> => {
    const { notifications } = await api.put<{
      notifications: UserNotifications;
    }>("/api/auth/notifications", data);
    return notifications;
  },

  getInvoiceSettings: async (): Promise<InvoiceReceiptSettings> => {
    return api.get<InvoiceReceiptSettings>("/api/auth/invoice-settings");
  },

  // Accepts a partial document (the UI saves one tab — `invoice` or `receipt` —
  // at a time) and returns the full, merged settings.
  saveInvoiceSettings: async (
    data: Partial<InvoiceReceiptSettings>,
  ): Promise<InvoiceReceiptSettings> => {
    return api.put<InvoiceReceiptSettings>("/api/auth/invoice-settings", data);
  },

  getAiSettings: async (): Promise<AiSettings> => {
    return api.get<AiSettings>("/api/auth/ai-settings");
  },

  saveAiSettings: async (data: Partial<AiSettings>): Promise<AiSettings> => {
    return api.put<AiSettings>("/api/auth/ai-settings", data);
  },

  updateBusinessType: async (businessType: BusinessType): Promise<User> => {
    const { user: raw } = await api.patch<{ user: Record<string, unknown> }>(
      "/api/auth/business-type",
      { businessType },
    );
    const user = mapRawUser(raw);
    useUserStore.getState().updateUser(user);
    return user;
  },
};
