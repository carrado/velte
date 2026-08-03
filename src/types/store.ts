import type { ReactNode } from "react";
import type { SectorClassification } from "@/types/sectors";

/** The vendor's own store profile — editable fields only. */
export interface Store {
  handle: string;
  name: string;
  description: string;
  sectors: string[];
  whatsapp: string | null;
  gallery: string[];
}

// `sectors` is read-only here — it's a derived cache of User.sectors,
// written only via PATCH /api/auth/sectors (see settingsApi.updateSectors).
export type UpdateStorePayload = Partial<Omit<Store, "sectors">>;

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
  /** Vendor-entered "service details" — a service's own attributes, shown in
   *  full only in OfferingDetailModal (the card itself only has room for a
   *  truncated description). */
  attributes: { name: string; value: string }[];
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
