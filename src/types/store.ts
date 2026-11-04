import type { ReactNode } from "react";
import type { SectorClassification } from "@/types/sectors";

/** The vendor's own store profile — editable fields only. */
export interface Store {
  handle: string;
  name: string;
  description: string;
  sectors: string[];
  whatsapp: string | null;
  social?: {
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
    x: string | null;
  };
  gallery: string[];
}

// `sectors` is read-only here — it's a derived cache of User.sectors,
// written only via PATCH /api/auth/sectors (see settingsApi.updateSectors).
export type UpdateStorePayload = Partial<Omit<Store, "sectors">>;

export interface PublicStoreProduct {
  id: string;
  name: string;
  /** Public URL path `/{slug}`. Null only for unsynced legacy rows. */
  slug?: string | null;
  kind: "product" | "service";
  quoteOnRequest?: boolean;
  /** Kobo — the backend stores product prices in minor units. */
  price: number;
  /** High end of a price range (kobo); null = single price. */
  priceMax?: number | null;
  currency: string;
  mainImageUrl: string | null;
  /** Everything beyond the main image — the card always shows just
   *  mainImageUrl; OfferingDetailModal renders the full [main, ...these] set
   *  as a swipeable carousel when there's more than one. */
  thumbnailUrls: string[];
  description: string | null;
  /** Vendor-entered "service details" — a service's own attributes, shown in
   *  full only in OfferingDetailModal (the card itself only has room for a
   *  truncated description). */
  attributes: { name: string; value: string }[];
  /** True when this listing can be added to cart (fixed naira price, stock,
   *  and the vendor has a payout account). WhatsApp stays the CTA otherwise. */
  checkoutEligible?: boolean;
  /** Who gets the order to the buyer — see docs/delivery-integration-plan.md. */
  delivery?: {
    method: "included" | "none" | "byol";
    areas: string[];
    note: string | null;
  };
}

/** What the public /store/[handle] page renders. */
export interface PublicStore extends Store {
  // Needed so a buyer's "Chat"/"Enquire" click on this page can bill the
  // right vendor's wallet (see reportLead) — the backend already returns it
  // for exactly this purpose (see velte-backend's getPublicStore).
  vendorId: string;
  avatar: string | null;
  area: string | null;
  /** Server-derived shim from the store's current sectors (see
   *  velte-backend's getPublicStore) — not a stored account field. */
  businessType: SectorClassification;
  products: PublicStoreProduct[];
}

/** Tab switcher for the public storefront's catalog body — About was dropped,
 *  the Intro sidebar already covers that ground. */
export type PublicStoreTab = "products" | "services";

/** Both card types share the same social-post-style layout and CTA. */
export interface PublicStoreProductProps {
  product: PublicStoreProduct;
  storeName: string;
  storeHandle: string;
  whatsapp: string | null;
  vendorId: string;
  // True when the signed-in viewer IS this store's own vendor — every CTA
  // in this file is suppressed then (no chatting yourself, no billing
  // yourself a lead), see OwnListingBadge.
  isOwn: boolean;
}

export interface StoreTabsProps {
  goods: PublicStoreProduct[];
  services: PublicStoreProduct[];
  storeName: string;
  storeHandle: string;
  whatsapp: string | null;
  vendorId: string;
  defaultTab: PublicStoreTab;
  sidebar: ReactNode;
  isOwn: boolean;
}

export interface IntroCardProps {
  store: PublicStore;
  goodsCount: number;
  servicesCount: number;
  whatsappHref: string | null;
  isOwn: boolean;
}

/** One card in the "/" homepage's marketplace preview grid — a flat,
 *  Instagram-shop-style listing (not grouped by store), with the vendor
 *  shown as a rounded avatar + bold name + verified badge, not a text
 *  byline. See velte-backend's getMarketplacePreview. */
export interface MarketplacePreviewItem {
  id: string;
  name: string;
  kind: "product" | "service";
  quoteOnRequest: boolean;
  /** Kobo — same raw-kobo convention as PublicStoreProduct; divide by 100
   *  before formatting. */
  price: number;
  priceMax: number | null;
  currency: string;
  mainImageUrl: string | null;
  /** Everything beyond the main image — the card shows just mainImageUrl,
   *  ListingDetailModal renders [main, ...these] as a swipeable carousel
   *  when there's more than one. */
  thumbnailUrls: string[];
  description: string | null;
  /** Vendor-entered "service details" — shown in full only in
   *  ListingDetailModal (the card only has room for a truncated
   *  description). */
  attributes: { name: string; value: string }[];
  vendorId: string;
  storeName: string;
  storeHandle: string;
  storeAvatar: string | null;
  whatsapp: string | null;
  checkoutEligible?: boolean;
}

/** One card in the "/" homepage's Vendors section — a Twitter-profile-style
 *  card: `gallery` renders as a sliding cover photo, `avatar` overlaps its
 *  bottom edge. See velte-backend's getVendorsPreview. */
export interface VendorPreviewItem {
  vendorId: string;
  name: string;
  handle: string;
  description: string | null;
  sectors: string[];
  whatsapp: string | null;
  gallery: string[];
  avatar: string | null;
}

/** One card in the /marketplace browse page — the full catalog, not a
 *  capped teaser (see velte-backend's getMarketplaceBrowse). Same shape as
 *  MarketplacePreviewItem plus categoryId, which the preview grid never
 *  needed since it has no category filter rail. Many existing listings
 *  predate the sector→category taxonomy and carry categoryId: null — those
 *  still render, just outside any specific category filter. */
export interface MarketplaceBrowseItem extends MarketplacePreviewItem {
  categoryId: string | null;
}

/** One chip in the marketplace browse page's category rail. Deliberately
 *  includes every seeded category, even ones with zero current listings —
 *  see velte-backend's getPublicCategories. */
export interface PublicCategory {
  id: string;
  name: string;
  emoji: string | null;
}

/** Star-rating bucket for product / vendor review summaries. */
export interface ReviewDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ReviewSummary {
  avg: number | null;
  count: number;
  distribution: ReviewDistribution;
}

/** Single-product page payload — GET /store/by-handle/:handle/products/:id. */
export interface PublicProductDetail {
  product: PublicStoreProduct;
  store: {
    handle: string;
    name: string;
    description: string | null;
    sectors: string[];
    vendorId: string;
    avatar: string | null;
    verified: boolean;
    /** Structured address parts — UI shows these only, never area/street. */
    state: string | null;
    country: string | null;
    locationLabel: string | null;
    ratingAvg: number | null;
    ratingCount: number;
    /** Null unless viewer is Buyer Premium (hub_social_contact). */
    whatsapp: string | null;
  };
  reviews: {
    product: ReviewSummary;
    vendor: ReviewSummary;
  };
  viewer: {
    signedIn: boolean;
    premium: boolean;
    tier: string;
  };
}
