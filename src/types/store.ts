/** The vendor's own store profile — editable fields only. */
export interface Store {
  handle: string;
  name: string;
  description: string;
  sectors: string[];
  whatsapp: string | null;
  gallery: string[];
}

export type UpdateStorePayload = Partial<Store>;

export interface PublicStoreProduct {
  id: string;
  name: string;
  kind: "product" | "service";
  priceFrom: boolean;
  /** Kobo — the backend stores product prices in minor units. */
  price: number;
  currency: string;
  discountedPrice: number | null;
  mainImageUrl: string | null;
  description: string | null;
}

/** What the public /store/[handle] page renders. */
export interface PublicStore extends Store {
  avatar: string | null;
  area: string | null;
  businessType: "retail" | "food";
  products: PublicStoreProduct[];
}
