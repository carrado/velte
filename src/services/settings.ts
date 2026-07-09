import { api } from "@/lib/api-client";
import { useUserStore } from "@/store/userStore";
import type {
  User,
  UserCompany,
  UserPreferences,
  UserLocation,
  BusinessType,
} from "@/types/user";

export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  avatar?: string;
  area?: string;
  state?: string;
  location?: UserLocation;
}

export interface UpdateProfileResult {
  user: User;
  /** True when an area/location change in this request was rejected by the
   * cooldown — the rest of the profile (name, phone, etc.) still saved. */
  addressChangeBlocked: boolean;
  addressChangeAvailableAt: string | null;
}

/** Mirrors ADDRESS_CHANGE_COOLDOWN_MS in velte-backend's updateProfile
 * controller — lets the UI compute the same "locked until" window from
 * `addressChangedAt` alone, without waiting on a save attempt to find out. */
export const ADDRESS_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

// Backend returns geo as GeoJSON ({ type: "Point", coordinates: [lng, lat] })
// from both /auth/me (raw Mongoose doc) and /auth/profile (custom response) —
// normalise to { lat, lng } here so components never touch GeoJSON directly.
function mapGeo(geo: unknown): UserLocation | null {
  const coords = (geo as { coordinates?: unknown } | null)?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords as [number, number];
  return { lat, lng };
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
    businessType: (u.businessType as BusinessType) ?? undefined,
    area: (u.area as string) ?? undefined,
    state: (u.state as string) ?? undefined,
    location: mapGeo(u.geo),
    addressChangedAt: (u.addressChangedAt as string) ?? null,
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

  updateProfile: async (
    data: UpdateProfileData,
  ): Promise<UpdateProfileResult> => {
    const {
      user: raw,
      addressChangeBlocked,
      addressChangeAvailableAt,
    } = await api.put<{
      user: Record<string, unknown>;
      addressChangeBlocked: boolean;
      addressChangeAvailableAt: string | null;
    }>("/api/auth/profile", data);
    const user = mapRawUser(raw);
    useUserStore.getState().updateUser(user);
    return { user, addressChangeBlocked, addressChangeAvailableAt };
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
