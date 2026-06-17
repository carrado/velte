import { apiClient } from "@/lib/api";
import type {
  PayLinkData,
  InitializePayResponse,
  InitializePayPayload,
} from "@/types/pay";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Public pay-page service. These hit velte-backend's `/api/pay/*` endpoints
 * (no auth — the linkId is the capability). The 401 redirect baked into
 * `apiClient` never fires here because these endpoints don't return 401.
 */
export async function getPayLink(
  linkId: string,
  ref?: string,
): Promise<PayLinkData> {
  const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const res = await apiClient<Envelope<PayLinkData>>(
    `/pay/${encodeURIComponent(linkId)}${qs}`,
  );
  return res.data;
}

export async function initializePay(
  linkId: string,
  payload: InitializePayPayload,
): Promise<InitializePayResponse> {
  const res = await apiClient<Envelope<InitializePayResponse>>(
    `/pay/${encodeURIComponent(linkId)}/initialize`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}
