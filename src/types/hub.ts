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
  tier?: string | undefined;
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

/** One card in GET /api/hub/vendors — full buyer directory. */
export interface HubDirectoryVendor {
  vendorId: string;
  name: string;
  handle: string;
  description: string | null;
  sectors: string[];
  place: string | null;
  state: string | null;
  avatar: string | null;
  imageUrl: string | null;
  verified: boolean;
  sponsored: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  whatsapp: string | null;
  social: HubSocial | null;
  trusted: boolean;
  favourite: boolean;
  fastDelivery: boolean;
}

export interface HubVendorsDirectory {
  premium: boolean;
  vendors: HubDirectoryVendor[];
  sectors: HubSectorCount[];
  locations: HubSectorCount[];
}

export type HubTimelineKind = "product" | "promotion" | "update";

/** The product or service a Hub post opens in ListingDetailModal. */
export interface HubTimelineListing {
  productId: string;
  /** Public product URL is /{slug}. Null only until the listing has a slug. */
  slug?: string | null;
  name: string;
  kind: "product" | "service";
  quoteOnRequest: boolean;
  /** Kobo, same unit the Product document stores. */
  price: number;
  priceMax: number | null;
  currency: string;
  description: string | null;
  images: string[];
  attributes: { name: string; value: string }[];
  checkoutEligible: boolean;
}

export interface HubTimelineItem {
  tier?: string | undefined;
  boosted?: boolean;
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
  listing?: HubTimelineListing | null;
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
/** Present only for Buyer Basic — Hub returns a capped preview. */
export interface HubPreview {
  vendorCap: number;
  listingCap: number;
  vendorsCapped: boolean;
  listingsCapped: boolean;
}

export interface HubHome {
  role: "buyer" | "vendor";
  store?: {
    name: string;
    handle: string | null;
    avatar: string | null;
    verified: boolean;
    description: string | null;
  } | null;
  enterprise: boolean;
  /** Buyer Premium. Social contact on a card is theirs. */
  premium: boolean;
  /** Null/absent for Premium buyers and vendors who have no preview cap. */
  hubPreview?: HubPreview | null;
  sectors: HubSectorCount[];
  performance: {
    leads: HubWindow;
    salesKobo: HubWindow;
    ordersCount?: number;
    isLive?: boolean;
  } | null;
  featured: HubFeaturedVendor[];
  timeline: HubTimelineItem[];
  community: HubCommunityPost[];
  buyerBroadcasts: HubBuyerBroadcast[];
  broadcastPrefs: HubBroadcastPrefs;
  /** Consolidated vendor hub properties bundled on GET /api/hub/home for a single-shot load */
  context?: HubContext | null;
  adverts?: HubVendorAdvert[];
  boosts?: HubListingBoost[];
  activeBoosts?: HubListingBoost[];
}

export interface CreateBroadcastPayload {
  message: string;
  imageUrl?: string | null;
  advertId?: string | null;
}

export interface HubBoostTier {
  days: number;
  costKobo: number;
  reachMin?: number;
  reachMax?: number;
}

export interface HubListingBoost {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  productPrice: number | null;
  days: number;
  startsAt: string;
  endsAt: string;
  status: "active" | "cancelled" | "expired";
  costKobo: number;
  reachMin?: number;
  reachMax?: number;
  alreadyActive?: boolean;
}

/** GET /api/hub/context — everything the dashboard publish UI needs in one
 *  call. Prices arrive from the backend, never from client constants. */
export interface HubContext {
  tier: string;
  enterprise: boolean;
  advertCostKobo: number;
  broadcastCostKobo: number;
  advertDays: number;
  boostTiers?: HubBoostTier[];
  maxActiveAdverts: number;
  activeAdverts: number;
  draftBroadcasts: number;
  sendsPerDay: number;
  walletBalanceKobo: number;
  /** AI advert poster gens — Basic 2 / Enterprise 5; 24h cooldown after last used. */
  aiPosterLimit?: number;
  aiPosterUsed?: number;
  aiPosterRemaining?: number;
  /** ISO time when a fresh allowance opens (set when the last slot was used). */
  aiPosterResetsAt?: string | null;
}

// ── Enterprise Insights & Analytics Types ──────────────────────────────────

export interface HubAnalyticsTelemetry {
  views: number;
  clicks: number;
  ctr: number;
  categoryAvgCtr: number;
  salesKobo: number;
  ordersCount: number;
  leadsCount: number;
}

export interface HubFunnelStage {
  label: string;
  count: number;
  conversionPct: number;
}

export interface HubDailyTrend {
  date: string;
  views: number;
  clicks: number;
  ctr: number;
  orders: number;
  salesKobo: number;
}

export interface HubLeaderboardEntry {
  rank: number;
  name: string;
  handle?: string | null;
  avatar?: string | null;
  salesKobo: number;
  orders: number;
  conversionRate: string;
  badge?: string;
  verified: boolean;
  isEnterprise?: boolean;
  isCurrentVendor: boolean;
}

export interface HubAnalyticsData {
  period: string;
  sector: string;
  telemetry: HubAnalyticsTelemetry;
  funnel: {
    reach: HubFunnelStage;
    clicks: HubFunnelStage;
    leads: HubFunnelStage;
    orders: HubFunnelStage;
  };
  dailyTrends: HubDailyTrend[];
  leaderboard: HubLeaderboardEntry[];
  myRank: number;
}

// ── Velte Community Hub (Enterprise Vendors & Premium Buyers) ─────────────

export type HubCommunityCategory =
  | "announcement"
  | "discussion"
  | "update"
  | "feedback"
  | "b2b"
  | "gig"
  | "request";

export type HubCommunityAuthorType = "buyer" | "vendor" | "official" | "agent";

export interface HubCommunityReply {
  id: string;
  authorId: string;
  authorType: HubCommunityAuthorType;
  authorName: string;
  authorAvatar?: string | null;
  authorRoleBadge?: string | null;
  body: string;
  isVendorResponse?: boolean;
  createdAt: string;
}

export interface HubCommunityThread {
  id: string;
  vendorId?: string;
  title: string;
  body: string;
  category: HubCommunityCategory;
  authorId: string;
  authorType: HubCommunityAuthorType;
  authorName: string;
  authorAvatar?: string | null;
  authorRoleBadge?: string | null;
  storeName?: string | null;
  pinned?: boolean;
  likesCount: number;
  repliesCount: number;
  replies: HubCommunityReply[];
  resolved: boolean;
  createdAt: string;
}

export interface HubCommunityStats {
  enterpriseVendorsCount?: number;
  premiumBuyersCount?: number;
  discussionsCount: number;
  repliesCount: number;
  resolvedInquiriesCount: number;
  reputationScore?: number;
  followersCount?: number;
}

export interface HubCommunityData {
  communityName?: string;
  store?: { name: string; avatar?: string | null; handle?: string | null };
  stats: HubCommunityStats;
  posts: HubCommunityThread[];
}

export interface CreateCommunityPostPayload {
  title?: string;
  body: string;
  category?: HubCommunityCategory;
  pinned?: boolean;
}
