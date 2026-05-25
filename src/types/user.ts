export type BusinessType = "retail" | "food";

export interface UserCompany {
  name?: string;
  location?: string;
  services?: string[];
  phone?: string;
}

export interface UserNotifications {
  orders: boolean;
  invoices: boolean;
  invoiceThreshold: number;
  productUpdates: boolean;
  push: boolean;
}

export interface UserPreferences {
  notifications: UserNotifications;
  defaultCurrency?: string;
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
}
