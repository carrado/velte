import { api } from "@/lib/api-client";
import { useUserStore } from "@/store/userStore";
import type {
  SaveWhatsAppProfilePayload,
  WhatsAppProfileState,
} from "@/types/whatsapp-profile";

export async function fetchWhatsAppProfile(): Promise<WhatsAppProfileState> {
  return api.get<WhatsAppProfileState>("/api/ai-setup/whatsapp-profile");
}

export async function saveWhatsAppProfile(
  payload: SaveWhatsAppProfilePayload,
): Promise<{
  services: string[];
  featuredProductIds: string[];
  catalogSynced: boolean;
}> {
  const data = await api.put<{
    services: string[];
    featuredProductIds: string[];
    catalogSynced: boolean;
  }>("/api/ai-setup/whatsapp-profile", payload);

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
  await api.put("/api/ai-setup/whatsapp-profile", { profilePictureUrl });
}

export async function updateUserServices(services: string[]): Promise<void> {
  const user = useUserStore.getState().user;
  if (!user?.id) return;

  const { user: updated } = await api.put<{
    user: { company?: { services?: string[] } };
  }>("/api/auth/profile", { services });

  useUserStore.getState().updateUser({
    company: {
      ...user.company,
      services: updated.company?.services ?? services,
    },
    services: updated.company?.services ?? services,
  });
}
