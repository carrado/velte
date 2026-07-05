import type { ReactNode } from "react";
import type { BusinessType } from "@/types/user";

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
export type UpdateStorePayload = Partial<Omit<Store, "connectedCatalog">>;

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
  businessType: BusinessType;
  products: PublicStoreProduct[];
}

/** Facebook-profile-style tab switcher on the public storefront. */
export type PublicStoreTab = "products" | "services" | "photos" | "about";

export interface PublicStoreProductProps {
  product: PublicStoreProduct;
}

export interface ServiceCardProps extends PublicStoreProductProps {
  storeName: string;
  whatsapp: string | null;
}

export interface StoreTabsProps {
  goods: PublicStoreProduct[];
  services: PublicStoreProduct[];
  photos: string[];
  isFood: boolean;
  storeName: string;
  whatsapp: string | null;
  description: string;
  area: string | null;
  sectors: string[];
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
