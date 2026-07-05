export type BusinessType = "retail" | "food" | "service" | "both" | "food_both";

export interface UserCompany {
  name?: string;
  location?: string;
  services?: string[];
  phone?: string;
  state?: string;
}

export interface UserPreferences {
  defaultCurrency?: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  country: string;
  username: string;
  phone?: string;
  avatar?: string;
  businessName?: string;
  address?: string;
  services?: string[];
  company?: UserCompany;
  preferences?: UserPreferences;
  onboarding: boolean;
  businessType?: BusinessType;
  area?: string;
  state?: string;
  location?: UserLocation | null;
  /** When area/state/location was last changed — drives the address-change cooldown. */
  addressChangedAt?: string | null;
  sector?: string;
  description?: string;
}
