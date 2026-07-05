import { backendData } from "./backend";
import type {
  Store,
  UpdateStorePayload,
  PublicStore,
  ConnectedCatalog,
} from "@/types/store";

export async function getMyStore(cookie: string): Promise<Store> {
  return backendData<Store>("/store/me", { cookie });
}

export async function updateMyStore(
  payload: UpdateStorePayload,
  cookie: string,
): Promise<Store> {
  return backendData<Store>("/store/me", {
    method: "PUT",
    body: payload,
    cookie,
  });
}

/** Connect the vendor's own website — probes + records the source upstream. */
export async function connectCatalog(
  sourceUrl: string,
  cookie: string,
): Promise<ConnectedCatalog> {
  return backendData<ConnectedCatalog>("/store/connect-catalog", {
    method: "POST",
    body: { source_url: sourceUrl },
    cookie,
  });
}

/** Public — no cookie; used by the /store/[handle] server component. */
export async function getPublicStore(handle: string): Promise<PublicStore> {
  return backendData<PublicStore>(
    `/store/by-handle/${encodeURIComponent(handle)}`,
  );
}
