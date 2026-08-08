import { backendData } from "./backend";
import type {
  Store,
  UpdateStorePayload,
  PublicStore,
  MarketplacePreviewItem,
  VendorPreviewItem,
  MarketplaceBrowseItem,
  PublicCategory,
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

/** Public — no cookie; feeds the /marketplace browse page's full grid. */
export async function getMarketplaceBrowse(): Promise<MarketplaceBrowseItem[]> {
  return backendData<MarketplaceBrowseItem[]>("/store/marketplace");
}

/** Public — no cookie; feeds the /marketplace browse page's Vendors
 *  section — the full directory, not the "/" homepage's capped preview. */
export async function getVendorsBrowse(): Promise<VendorPreviewItem[]> {
  return backendData<VendorPreviewItem[]>("/store/vendors");
}

/** Public — no cookie; feeds the /marketplace browse page's category rail.
 *  Not the same as categoriesApi.getCategories (vendor-authenticated, used
 *  by the Add-Offering wizard) — this is the buyer-facing equivalent. */
export async function getPublicCategories(): Promise<PublicCategory[]> {
  return backendData<PublicCategory[]>("/store/categories");
}

/** Public — no cookie; feeds sitemap.ts so every storefront is discoverable. */
export async function listStoreHandlesForSitemap(): Promise<
  { handle: string; updatedAt: string }[]
> {
  return backendData<{ handle: string; updatedAt: string }[]>(
    "/store/sitemap-handles",
  );
}
