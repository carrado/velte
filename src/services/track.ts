import { api } from "@/lib/api-client";
import type { TrackOrderData, TrackKeyPayload } from "@/types/track";

/**
 * Public order-tracking service. Hits Velte's `/api/track/:token` route
 * (no auth — the token + key pair is the capability). The backend returns
 * 403 (not 401) for a wrong key, so the api client's 401-redirect never fires.
 */
export async function trackOrder(
  token: string,
  key: string,
): Promise<TrackOrderData> {
  return api.post<TrackOrderData>(`/api/track/${encodeURIComponent(token)}`, {
    key,
  } satisfies TrackKeyPayload);
}
