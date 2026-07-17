import type { ReactNode } from "react";
import type { SectorClassification } from "@/types/sectors";

/** How Velte pulls a connected catalog (spec §16.1 adapters). */
export type CatalogPlatform = "woocommerce" | "shopify" | "feed" | "unknown";

/** A connected website mirrored into Velte. `status: "review"` means the site
 *  wasn't auto-detectable and needs manual onboarding. */
export interface ConnectedCatalog {
  sourceUrl: string;
  platform: CatalogPlatform;
  status: "connected" | "review";
  productCount: number;
  connectedAt: string | null;
  lastSyncedAt: string | null;
}

/** The vendor's own store profile — editable fields only. */
export interface Store {
  handle: string;
  name: string;
  description: string;
  sectors: string[];
  whatsapp: string | null;
  gallery: string[];
  /** The vendor's own store only. Null until they connect a website; absent on
   *  the public storefront. */
  connectedCatalog?: ConnectedCatalog | null;
}

// `connectedCatalog` is managed via its own endpoint, not the profile PUT.
// `sectors` is read-only here too — it's a derived cache of User.sectors,
// written only via PATCH /api/auth/sectors (see settingsApi.updateSectors).
export type UpdateStorePayload = Partial<
  Omit<Store, "connectedCatalog" | "sectors">
>;

export interface ConnectCatalogPayload {
  sourceUrl: string;
}

export interface PublicStoreProduct {
  id: string;
  name: string;
  kind: "product" | "service";
  quoteOnRequest?: boolean;
  /** Kobo — the backend stores product prices in minor units. */
  price: number;
  /** High end of a price range (kobo); null = single price. */
  priceMax?: number | null;
  currency: string;
  mainImageUrl: string | null;
  description: string | null;
}

/** What the public /store/[handle] page renders. */
export interface PublicStore extends Store {
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
  whatsapp: string | null;
}

export interface StoreTabsProps {
  goods: PublicStoreProduct[];
  services: PublicStoreProduct[];
  isFood: boolean;
  storeName: string;
  whatsapp: string | null;
  defaultTab: PublicStoreTab;
  sidebar: ReactNode;
}

export interface IntroCardProps {
  store: PublicStore;
  goodsCount: number;
  servicesCount: number;
  isFood: boolean;
  whatsappHref: string | null;
}
