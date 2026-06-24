import { api } from "@/lib/api-client";
import type {
  PayLinkData,
  InitializePayResponse,
  InitializePayPayload,
} from "@/types/pay";

/**
 * Public pay-page service. Hits Velte's `/api/pay/*` routes (no auth — the
 * linkId is the capability). The backend never returns 401 here, so the
 * api client's 401-redirect never fires on this public page.
 */
export async function getPayLink(
  linkId: string,
  ref?: string,
): Promise<PayLinkData> {
  const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  return api.get<PayLinkData>(`/api/pay/${encodeURIComponent(linkId)}${qs}`);
}

export async function initializePay(
  linkId: string,
  payload: InitializePayPayload,
): Promise<InitializePayResponse> {
  return api.post<InitializePayResponse>(
    `/api/pay/${encodeURIComponent(linkId)}/initialize`,
    payload,
  );
}
