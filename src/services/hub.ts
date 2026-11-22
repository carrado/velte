import { ApiError, api } from "@/lib/api-client";
import { uploadAdvertMedia } from "@/lib/cloudinary";
import { overlayStoreLogoOnPoster } from "@/lib/overlayStoreLogo";
import type {
  CreateBroadcastPayload,
  CreateCommunityPostPayload,
  HubAnalyticsData,
  HubBroadcastStatus,
  HubBuyerGigsData,
  HubBuyerPromotion,
  HubCommunityData,
  HubCommunityReply,
  HubCommunityThread,
  HubContext,
  HubGigItem,
  HubHome,
  HubListingBoost,
  HubVendorAdvert,
  HubVendorBroadcast,
  HubVendorsDirectory,
} from "@/types/hub";

// The page-blocking Hub reads. The nav prefetch and the pages share these
// so a click on Vendors Hub lands with the data already in cache.
//
// Same contract as the products list: the prefetch is the fetch. Arrival
// reads the cache and refetches if stale or invalidated.
export const hubPageQueryOptions = {
  staleTime: 15_000,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
} as const;

/**
 * Real-time polling options for the Hub feed:
 * Polls every 7 seconds when active window is open so newly listed products,
 * broadcasts, adverts, and updates arrive in real time.
 */
export const hubRealtimeQueryOptions = {
  staleTime: 4000,
  refetchInterval: 7000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const;

export async function fetchHubHome(
  scope?: "vendor" | "buyer",
): Promise<HubHome> {
  if (scope === "vendor") {
    return api.get<HubHome>("/api/hub/home?scope=vendor");
  }
  const path =
    scope === "buyer" ? "/api/hub/home?scope=buyer" : "/api/hub/home";
  const res = await fetch(path);
  if (!res.ok) throw new ApiError(res.status, "Couldn't load the Hub.");
  return (await res.json()) as HubHome;
}

export function fetchHubContext() {
  return api.get<HubContext>("/api/hub/context");
}

export async function fetchHubVendors(): Promise<HubVendorsDirectory> {
  const res = await fetch("/api/hub/vendors");
  if (!res.ok) throw new ApiError(res.status, "Couldn't load vendors.");
  return (await res.json()) as HubVendorsDirectory;
}

export async function fetchHubAdverts() {
  try {
    return await api.get<HubVendorAdvert[]>("/api/hub/adverts");
  } catch {
    return [] as HubVendorAdvert[];
  }
}

export async function fetchHubBoosts() {
  return api.get<HubListingBoost[]>("/api/hub/boosts");
}

export async function createHubBoost(productId: string, days: number) {
  return api.post<HubListingBoost>("/api/hub/boosts", { productId, days });
}

export async function cancelHubBoost(id: string) {
  return api.post<{ id: string }>(`/api/hub/boosts/${id}/cancel`);
}

export async function fetchHubBroadcasts() {
  try {
    return await api.get<HubVendorBroadcast[]>("/api/hub/broadcasts");
  } catch {
    return [] as HubVendorBroadcast[];
  }
}

export async function createHubBroadcast(payload: CreateBroadcastPayload) {
  return api.post<{
    id: string;
    status: HubBroadcastStatus;
    audienceCount?: number | null;
    sentAt?: string | null;
  }>("/api/hub/broadcasts", payload);
}

export async function sendHubBroadcast(id: string) {
  return api.post<{
    id: string;
    status: HubBroadcastStatus;
    audienceCount?: number | null;
    sentAt?: string | null;
  }>(`/api/hub/broadcasts/${encodeURIComponent(id)}/send`);
}

export async function cancelHubBroadcast(id: string) {
  return api.post<{ id: string }>(
    `/api/hub/broadcasts/${encodeURIComponent(id)}/cancel`,
  );
}

export async function fetchHubAnalytics() {
  return api.get<HubAnalyticsData>("/api/hub/analytics");
}

export async function fetchHubCommunity() {
  return api.get<HubCommunityData>("/api/hub/community");
}

export async function createCommunityPost(payload: CreateCommunityPostPayload) {
  return api.post<HubCommunityThread>("/api/hub/community", payload);
}

export async function toggleCommunityPostLike(postId: string) {
  return api.post<{ liked: boolean; likesCount: number }>(
    `/api/hub/community/posts/${postId}/like`,
  );
}

export async function addCommunityPostReply(postId: string, body: string) {
  return api.post<HubCommunityReply>(
    `/api/hub/community/posts/${postId}/replies`,
    { body },
  );
}

export type AiPosterResult = {
  imageUrl: string;
  headlines: string[];
  blurb: string;
  remaining: number;
  limit: number;
  used: number;
  resetsAt?: string | null;
};

type AiPosterApiPayload = {
  imageBase64: string;
  mimeType?: string;
  headlines: string[];
  blurb: string;
  remaining: number;
  limit: number;
  used: number;
  resetsAt?: string | null;
};

/** AI poster gen can take >15s — bypasses the shared api-client deadline.
 *  Server returns PNG bytes; the browser stamps the store logo (when present)
 *  then hosts on Cloudinary (avoids Node DNS failures for api.cloudinary.com). */
export async function generateAiPoster(body: {
  storeName: string;
  prompt: string;
  instructions?: string | null;
  productName?: string | null;
  /** Store / vendor avatar — omitted or null skips the logo overlay. */
  logoUrl?: string | null;
  /** Dominant hex colours from the logo — drives poster palette when set. */
  palette?: string[] | null;
  onProgress?: (progress: number, stage: string) => void;
}): Promise<AiPosterResult> {
  let res: Response;
  try {
    res = await fetch("/api/hub/ai-poster", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: body.storeName,
        prompt: body.prompt,
        instructions: body.instructions,
        productName: body.productName,
        palette: body.palette,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new ApiError(
      0,
      "Couldn't reach the server. Please check your internet connection and try again.",
    );
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }

  if (!res.ok) {
    const rawError = (data as { error?: unknown } | null)?.error;
    const message =
      typeof rawError === "string" && rawError.trim()
        ? rawError
        : "Couldn't generate an AI poster.";
    throw new ApiError(res.status, message, data);
  }

  const payload = data as AiPosterApiPayload;
  if (!payload?.imageBase64) {
    throw new ApiError(502, "Couldn't generate an AI poster.");
  }

  body.onProgress?.(84, "Compositing verified store logo & brand capsule…");

  try {
    const file = await overlayStoreLogoOnPoster(
      payload.imageBase64,
      payload.mimeType || "image/png",
      body.logoUrl,
      body.storeName,
    );

    body.onProgress?.(92, "Finalizing high-resolution creative…");

    const imageUrl = await uploadAdvertMedia(file, "velte/adverts/ai-posters");

    body.onProgress?.(100, "Advert poster ready!");

    return {
      imageUrl,
      headlines: payload.headlines ?? [],
      blurb: payload.blurb ?? "",
      remaining: payload.remaining,
      limit: payload.limit,
      used: payload.used,
      resetsAt: payload.resetsAt ?? null,
    };
  } catch (err) {
    throw new ApiError(
      502,
      err instanceof Error && err.message.trim()
        ? err.message
        : "Couldn't save the poster image. Check your connection and try again.",
    );
  }
}

export async function fetchBuyerSponsoredAdverts(): Promise<
  HubBuyerPromotion[]
> {
  const res = await fetch("/api/hub/buyer-adverts");
  if (!res.ok)
    throw new ApiError(res.status, "Could not load your sponsored adverts");
  const json = await res.json();
  const raw = json?.data ?? json;
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray((raw as { data?: HubBuyerPromotion[] }).data)) {
    return (raw as { data: HubBuyerPromotion[] }).data;
  }
  return [];
}

export async function fetchHubGigs(params?: {
  workMode?: string;
  search?: string;
  category?: string;
}): Promise<HubGigItem[]> {
  const q = new URLSearchParams();
  if (params?.workMode && params.workMode !== "all")
    q.set("workMode", params.workMode);
  if (params?.search?.trim()) q.set("search", params.search.trim());
  if (params?.category && params.category !== "all")
    q.set("category", params.category);
  const path = q.toString() ? `/api/hub/gigs?${q.toString()}` : "/api/hub/gigs";
  const res = await fetch(path);
  if (!res.ok) throw new ApiError(res.status, "Could not fetch available gigs");
  const json = await res.json();
  const raw = json?.data ?? json;
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray((raw as { data?: HubGigItem[] }).data)) {
    return (raw as { data: HubGigItem[] }).data;
  }
  return [];
}

export async function fetchMyBuyerGigs(): Promise<HubBuyerGigsData> {
  const res = await fetch("/api/hub/gigs/mine");
  if (!res.ok) throw new ApiError(res.status, "Could not fetch your gigs");
  const json = await res.json();
  return json?.data ?? json;
}
