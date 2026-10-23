import type { VendorPreviewItem } from "./store";

// Vendors Hub (Phase 4) — frontend shapes for GET /api/hub/feed and the
// vendor publish endpoints. Mirrors velte-backend's HubAdvert / HubBroadcast
// models; the backend owns pricing, placement and badges, these only describe.

/** One paid slot at the top of the Hub feed. Always rendered with a
 *  "Sponsored" label — payment buys position, never relevance. */
export interface HubAdvert {
  id: string;
  vendorId: string;
  imageUrl: string;
  /** Velte template id. null = custom upload. */
  templateId: string | null;
  headline: string;
  blurb: string | null;
  productId: string | null;
  boosted: boolean;
  endsAt: string;
  /** Always true from the feed — kept on the shape so a card can't be
   *  rendered without labelling it. */
  sponsored: true;
  storeName: string | null;
  storeHandle: string | null;
  avatar: string | null;
  /** Level-3 verification only. `trusted` / `fastDelivery` arrive with
   *  Phase 1.2/1.4 data. */
  verified: boolean;
}

/** Vendor directory entry on the Hub feed — the marketplace vendor shape
 *  plus the computed verification badge. Renders through VendorCard as-is. */
export interface HubVendor extends VendorPreviewItem {
  verified: boolean;
}

export interface HubFeed {
  adverts: HubAdvert[];
  products: HubProduct[];
  broadcasts: HubBroadcastPost[];
  vendors: HubVendor[];
}

/** One vendor upload on the timeline — newest first, capped server-side. */
export interface HubProduct {
  id: string;
  vendorId: string;
  name: string;
  kind: "product" | "service";
  quoteOnRequest?: boolean;
  price: number;
  priceMax: number | null;
  currency: string;
  mainImageUrl: string | null;
  description: string | null;
  createdAt: string;
  storeName: string | null;
  storeHandle: string | null;
  avatar: string | null;
  verified: boolean;
}

/** A sent broadcast, rendered inline once the send path ships. Empty until
 *  then — the shape is ready, the audience isn't. */
export interface HubBroadcastPost {
  id: string;
  vendorId: string;
  message: string;
  imageUrl: string | null;
  sentAt: string;
  storeName: string | null;
  storeHandle: string | null;
  avatar: string | null;
  verified: boolean;
}

export type HubAdvertStatus = "active" | "expired" | "cancelled";
export type HubBroadcastStatus = "draft" | "queued" | "sent" | "cancelled";

export interface HubVendorAdvert {
  id: string;
  imageUrl: string;
  templateId: string | null;
  headline: string;
  blurb: string;
  productId: string | null;
  status: HubAdvertStatus;
  pinned: boolean;
  boosted: boolean;
  startsAt: string;
  endsAt: string;
  costKobo: number;
  enterpriseFree: boolean;
  views: number;
  clicks: number;
}

export interface HubVendorBroadcast {
  id: string;
  message: string;
  imageUrl: string | null;
  advertId: string | null;
  status: HubBroadcastStatus;
  audienceCount: number | null;
  costKobo: number | null;
  enterpriseFree: boolean;
  sentAt: string | null;
}

export interface CreateAdvertPayload {
  imageUrl: string;
  headline: string;
  blurb?: string;
  templateId?: string | null;
  productId?: string | null;
  /** Also draft the linked broadcast (send — and its charge — later). */
  boosted?: boolean;
}

export interface HubWindow {
  current: number;
  previous: number;
}

export interface HubFeaturedVendor {
  vendorId: string;
  name: string;
  handle: string;
  description: string | null;
  sectors: string[];
  avatar: string | null;
  imageUrl: string | null;
  verified: boolean;
  sponsored: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  place: string | null;
  /** Present only for a Buyer Premium. The channel stays off the payload otherwise. */
  whatsapp: string | null;
  social: HubSocial | null;
  fastDelivery: boolean;
  favourite: boolean;
  /** Verified, 10 completed orders, no dispute lost in 90 days. */
  trusted: boolean;
  sentiment: HubSentiment | null;
  /** An order this buyer has confirmed and not yet reviewed. */
  reviewableOrderId: string | null;
}

export type HubTimelineKind = "product" | "promotion" | "update";

export interface HubTimelineItem {
  id: string;
  vendorId: string;
  kind: HubTimelineKind;
  at: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  storeName: string | null;
  storeHandle: string | null;
  avatar: string | null;
  verified: boolean;
  sponsored: boolean;
  sectors: string[];
  place: string | null;
  images: string[];
  ratingAvg: number | null;
  ratingCount: number;
  whatsapp: string | null;
  social: HubSocial | null;
  advertId?: string | null;
  placedByBuyer?: boolean;
  fastDelivery: boolean;
  favourite: boolean;
  trusted: boolean;
  sentiment: HubSentiment | null;
  reviewableOrderId: string | null;
}

export interface HubSentiment {
  rating: number;
  text: string;
}

export interface HubSocial {
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  x: string | null;
}

export interface HubBuyerBroadcast {
  id: string;
  body: string;
  at: string;
  audienceCount: number;
  status: "queued";
}

export interface HubBroadcastPrefs {
  promoEnabled: boolean;
  promoSectors: string[];
}

export interface HubCommunityPost {
  id: string;
  body: string;
  authorType: "buyer" | "vendor";
  at: string;
}

export interface HubSectorCount {
  value: string;
  count: number;
}

/** GET /api/hub/home — shared by a signed-up buyer and a vendor.
 *  Performance and the store are present for a vendor only. */
export interface HubHome {
  role: "buyer" | "vendor";
  store: {
    name: string;
    handle: string | null;
    avatar: string | null;
    verified: boolean;
    description: string | null;
  } | null;
  enterprise: boolean;
  /** Buyer Premium. Social contact on a card is theirs. */
  premium: boolean;
  sectors: HubSectorCount[];
  performance: {
    leads: HubWindow;
    salesKobo: HubWindow;
  } | null;
  featured: HubFeaturedVendor[];
  timeline: HubTimelineItem[];
  community: HubCommunityPost[];
  buyerBroadcasts: HubBuyerBroadcast[];
  broadcastPrefs: HubBroadcastPrefs;
}

export interface CreateBroadcastPayload {
  message: string;
  imageUrl?: string | null;
  advertId?: string | null;
}

/** GET /api/hub/context — everything the dashboard publish UI needs in one
 *  call. Prices arrive from the backend, never from client constants. */
export interface HubContext {
  tier: string;
  enterprise: boolean;
  advertCostKobo: number;
  broadcastCostKobo: number;
  advertDays: number;
  maxActiveAdverts: number;
  activeAdverts: number;
  draftBroadcasts: number;
  sendsPerDay: number;
  walletBalanceKobo: number;
}
