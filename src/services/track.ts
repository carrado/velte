import { apiClient } from "@/lib/api";
import type { TrackOrderData, TrackKeyPayload } from "@/types/track";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Public order-tracking service. Hits velte-backend's `/api/track/:token`
 * endpoint (no auth — the token + key pair is the capability).
 *
 * Backend contract (designed here, to be implemented on velte-backend):
 *   POST /api/track/:token   body: { key }
 *     200 → { success: true, data: TrackOrderData }
 *     403 → invalid / missing key   (message surfaced to the customer)
 *     404 → unknown token
 *
 * IMPORTANT: the backend must NOT return 401 for a wrong key. `apiClient`
 * treats any 401 as an auth failure and full-page-redirects to the vendor
 * login — which would be wrong on this public page. Use 403 instead.
 */
export async function trackOrder(
  token: string,
  key: string,
): Promise<TrackOrderData> {
  const res = await apiClient<Envelope<TrackOrderData>>(
    `/track/${encodeURIComponent(token)}`,
    {
      method: "POST",
      body: JSON.stringify({ key } satisfies TrackKeyPayload),
    },
  );
  return res.data;
}
