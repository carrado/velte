import { api } from "@/lib/api-client";
import { useUserStore } from "@/store/userStore";
import type {
  User,
  UserCompany,
  UserPreferences,
  BusinessType,
} from "@/types/user";

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
