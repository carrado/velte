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
  area?: string;
  state?: string;
  location?: UserLocation | null;
  /** When area/state/location was last changed — drives the address-change cooldown. */
  addressChangedAt?: string | null;
  /** The vendor's operating sectors (taxonomy slugs, e.g. "phones_accessories")
   * — chosen at signup, up to 5, editable later from the Store editor. Drives
   * listing shape per-listing (see SectorLeaf.classification), not one frozen
   * account-wide type. */
  sectors: string[];
  description?: string;
  /** One-way server flag — starts `true` for every new account, flips to
   * `false` the first time the onboarding tour is skipped or finished.
   * Never set back to `true` client-side (the backend's PATCH /users/:id
   * only accepts the false transition). */
  onboarding?: boolean;
}
