export type BusinessType = "retail" | "food";

export interface UserCompany {
  name?: string;
  location?: string;
  services?: string[];
  phone?: string;
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
  location?: UserLocation | null;
}
