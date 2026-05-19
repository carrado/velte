import { apiClient } from "@/lib/api";
import { useUserStore } from "@/store/userStore";
import type {
  SaveWhatsAppProfilePayload,
  WhatsAppProfileState,
} from "@/types/whatsapp-profile";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function unwrap<T>(
  endpoint: string,
  init: Parameters<typeof apiClient>[1],
): Promise<T> {
  const res = await apiClient<ApiEnvelope<T>>(endpoint, init);
  return res.data;
}

export async function fetchWhatsAppProfile(): Promise<WhatsAppProfileState> {
  return unwrap<WhatsAppProfileState>("/ai-setup/whatsapp-profile", {
    method: "GET",
  });
}

export async function saveWhatsAppProfile(
  payload: SaveWhatsAppProfilePayload,
): Promise<{
  services: string[];
  featuredProductIds: string[];
  catalogSynced: boolean;
}> {
  const data = await unwrap<{
    services: string[];
    featuredProductIds: string[];
    catalogSynced: boolean;
  }>("/ai-setup/whatsapp-profile", {
    method: "PUT",
    data: payload,
  });

  useUserStore.getState().updateUser({
    company: {
      ...useUserStore.getState().user?.company,
      services: data.services,
    },
    services: data.services,
  });

  return data;
}

export async function updateWhatsAppProfilePicture(
  profilePictureUrl: string,
): Promise<void> {
  await unwrap<unknown>("/ai-setup/whatsapp-profile", {
    method: "PUT",
    data: { profilePictureUrl },
  });
}

export async function updateUserServices(services: string[]): Promise<void> {
  const user = useUserStore.getState().user;
  if (!user?.id) return;

  const res = await apiClient<{
    success: boolean;
    user: { company?: { services?: string[] } };
  }>("/auth/profile", {
    method: "PUT",
    data: { services },
  });

  useUserStore.getState().updateUser({
    company: {
      ...user.company,
      services: res.user.company?.services ?? services,
    },
    services: res.user.company?.services ?? services,
  });
}
