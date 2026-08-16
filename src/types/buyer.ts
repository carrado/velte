export interface BuyerLocationPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface Buyer {
  id: string;
  name: string | null;
  username: string | null;
  phone: string;
  // Required as of the 2026-08-15 login unification (see auth.js's login) —
  // null only ever appears on a pre-unification buyer doc that hasn't gone
  // through signup again.
  email: string | null;
  phoneVerified: boolean;
  location?: BuyerLocationPoint | null;
  area: string | null;
  state: string | null;
}
