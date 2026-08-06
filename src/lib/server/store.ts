import { backendData } from "./backend";
import type {
  Store,
  UpdateStorePayload,
  PublicStore,
  MarketplacePreviewItem,
  VendorPreviewItem,
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

/** Public — no cookie; used by the /store/[handle] server component. */
export async function getPublicStore(handle: string): Promise<PublicStore> {
  return backendData<PublicStore>(
    `/store/by-handle/${encodeURIComponent(handle)}`,
  );
}

/** Public — no cookie; feeds the "/" homepage's marketplace preview grid. */
export async function getMarketplacePreview(): Promise<
  MarketplacePreviewItem[]
> {
  return backendData<MarketplacePreviewItem[]>("/store/marketplace-preview");
}

/** Public — no cookie; feeds the "/" homepage's Vendors section. */
export async function getVendorsPreview(): Promise<VendorPreviewItem[]> {
  return backendData<VendorPreviewItem[]>("/store/vendors-preview");
}

/** Public — no cookie; feeds sitemap.ts so every storefront is discoverable. */
export async function listStoreHandlesForSitemap(): Promise<
  { handle: string; updatedAt: string }[]
> {
  return backendData<{ handle: string; updatedAt: string }[]>(
    "/store/sitemap-handles",
  );
}
