// 2026-08-18 — mirrors Buyer.model.js's own stripped-down shape: a buyer
// isn't an account, just a one-time phone verification (see that file's own
// comment). No name/email/username/location — a name, when one's needed,
// lives per-request on BuyerRequest instead, never here.
export interface Buyer {
  id: string;
  phone: string;
  phoneVerified: boolean;
}
