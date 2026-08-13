export interface BuyerLocationPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface Buyer {
  id: string;
  name: string | null;
  username: string | null;
  phone: string;
  phoneVerified: boolean;
  location?: BuyerLocationPoint | null;
  area: string | null;
  state: string | null;
}
