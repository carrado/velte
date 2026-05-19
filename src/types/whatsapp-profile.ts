export interface WhatsAppBusinessProfileData {
  about: string;
  address: string;
  description: string;
  email: string;
  website: string;
  vertical: string;
  profilePictureUrl: string | null;
}

export interface WhatsAppCatalogProductPayload {
  id: string;
  name: string;
  price: number;
  inStock: number;
}

export interface SaveWhatsAppProfilePayload {
  about: string;
  address: string;
  website: string;
  email?: string;
  vertical?: string;
  profilePictureUrl?: string;
  services: string[];
  featuredProducts: WhatsAppCatalogProductPayload[];
}

export interface WhatsAppProfileState {
  profile: WhatsAppBusinessProfileData | null;
  services: string[];
  featuredProductIds: string[];
  metaConnected: boolean;
  selectedNumberId: string | null;
}
