import { backendData } from "./backend";
import { proxyImageUrl, proxyImageUrls } from "./posterProxy";
import type {
  Store,
  UpdateStorePayload,
  PublicStore,
  PublicProductDetail,
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
  const store = await backendData<PublicStore>(
    `/store/by-handle/${encodeURIComponent(handle)}`,
  );
  if (!store) return store;
  return {
    ...store,
    avatar: proxyImageUrl(store.avatar),
    gallery: proxyImageUrls(store.gallery || []),
    products: (store.products || []).map((p) => ({
      ...p,
      mainImageUrl: proxyImageUrl(p.mainImageUrl),
      thumbnailUrls: proxyImageUrls(p.thumbnailUrls || []),
    })),
    adverts: (store.adverts || []).map((a) => ({
      ...a,
      imageUrl: proxyImageUrl(a.imageUrl) || a.imageUrl,
    })),
  };
}

/** Public product detail by slug — cookie optional so signed-in viewers get WhatsApp. */
export async function getPublicProductBySlug(
  slug: string,
  cookie?: string,
): Promise<PublicProductDetail> {
  const data = await backendData<PublicProductDetail>(
    `/store/products/by-slug/${encodeURIComponent(slug)}`,
    cookie ? { cookie } : undefined,
  );
  if (!data) return data;
  return {
    ...data,
    product: {
      ...data.product,
      mainImageUrl: proxyImageUrl(data.product.mainImageUrl),
      thumbnailUrls: proxyImageUrls(data.product.thumbnailUrls || []),
    },
    store: {
      ...data.store,
      avatar: proxyImageUrl(data.store.avatar),
    },
  };
}

/** Legacy /store/:handle/:id — used to redirect to /{slug}. */
export async function getPublicProduct(
  handle: string,
  productId: string,
  cookie?: string,
): Promise<PublicProductDetail> {
  const data = await backendData<PublicProductDetail>(
    `/store/by-handle/${encodeURIComponent(handle)}/products/${encodeURIComponent(productId)}`,
    cookie ? { cookie } : undefined,
  );
  if (!data) return data;
  return {
    ...data,
    product: {
      ...data.product,
      mainImageUrl: proxyImageUrl(data.product.mainImageUrl),
      thumbnailUrls: proxyImageUrls(data.product.thumbnailUrls || []),
    },
    store: {
      ...data.store,
      avatar: proxyImageUrl(data.store.avatar),
    },
  };
}

/** Public — no cookie; feeds the "/" homepage's marketplace preview grid. */
export async function getMarketplacePreview(): Promise<
  MarketplacePreviewItem[]
> {
  const items = await backendData<MarketplacePreviewItem[]>(
    "/store/marketplace-preview",
  );
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    mainImageUrl: proxyImageUrl(item.mainImageUrl),
    storeAvatar: proxyImageUrl(item.storeAvatar),
  }));
}

/** Public — no cookie; feeds the "/" homepage's Vendors section. */
export async function getVendorsPreview(): Promise<VendorPreviewItem[]> {
  const items = await backendData<VendorPreviewItem[]>(
    "/store/vendors-preview",
  );
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    avatar: proxyImageUrl(item.avatar),
    gallery: proxyImageUrls(item.gallery || []),
  }));
}

/** Public — no cookie; feeds the /marketplace browse page's full grid. */
export async function getMarketplaceBrowse(): Promise<MarketplaceBrowseItem[]> {
  const items =
    await backendData<MarketplaceBrowseItem[]>("/store/marketplace");
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    mainImageUrl: proxyImageUrl(item.mainImageUrl),
    storeAvatar: proxyImageUrl(item.storeAvatar),
  }));
}

/** Public — no cookie; feeds the /store/[handle] page's "Other vendors you
 *  may like" section — other discoverable vendors sharing this store's
 *  sectors (backend pads with other eligible vendors when there's no/thin
 *  overlap), same VendorPreviewItem shape as getVendorsPreview/Browse. */
export async function getSimilarVendors(
  handle: string,
): Promise<VendorPreviewItem[]> {
  const items = await backendData<VendorPreviewItem[]>(
    `/store/by-handle/${encodeURIComponent(handle)}/similar`,
  );
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    avatar: proxyImageUrl(item.avatar),
    gallery: proxyImageUrls(item.gallery || []),
  }));
}

/** Public — no cookie; feeds the /marketplace browse page's Vendors
 *  section — the full directory, not the "/" homepage's capped preview. */
export async function getVendorsBrowse(): Promise<VendorPreviewItem[]> {
  const items = await backendData<VendorPreviewItem[]>("/store/vendors");
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    avatar: proxyImageUrl(item.avatar),
    gallery: proxyImageUrls(item.gallery || []),
  }));
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
