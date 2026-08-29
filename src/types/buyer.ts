// 2026-08-18 — mirrored Buyer.model.js's stripped-down shape: a buyer wasn't
// an account, just a one-time phone verification.
//
// 2026-08-26 — buyers are real accounts again (Google sign-in), so their
// search conversations can be listed and reopened as a chat history. Mirrors
// the reversal documented on Buyer.model.js itself.
//
// Everything except `id` is nullable, and that is the shape rather than an
// oversight: a buyer can arrive by EITHER route, and neither fills both
// halves. Google sign-in gives an email/name/avatar and no phone; the
// existing phone+OTP path gives a phone and nothing else. Render for the
// half that exists — never assume a signed-in buyer has a phone (a Buyer
// Request still has to ask for one), and never assume they have a name.
export interface Buyer {
  id: string;
  phone: string | null;
  phoneVerified: boolean;
  email: string | null;
  name: string | null;
  avatar: string | null;
}
