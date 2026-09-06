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
  /** This buyer's own referral code, for their `?ref=` share link — they earn
   *  credits when someone joins through it (see lib/credits.ts
   *  REFERRAL_CREDITS). Already on the wire: the backend returns the whole
   *  Buyer document, so this only had to be declared to be usable.
   *
   *  Nullable because buyers created before referrals existed have none, and
   *  because a VENDOR acting as a buyer on /chat has no buyer document at
   *  all. Anything rendering it must handle its absence rather than showing
   *  an empty link. */
  referralCode: string | null;
  /** The VENDOR account proven to belong to the same person (2026-08-29's
   *  linked identities, first read 2026-09-05).
   *
   *  Set at Google sign-in when this buyer's address matches a vendor whose
   *  own email is verified — both halves have proven they own it, which is
   *  the whole reason the link is on email and may only ever be on email
   *  (vendor PHONES are never OTP-verified; see CLAUDE.md).
   *
   *  Null for the overwhelming majority of buyers, who have no vendor
   *  account at all. Already on the wire for the same reason `referralCode`
   *  is — the backend returns the whole Buyer document — so this only had to
   *  be declared to become usable.
   *
   *  This is the first thing to actually read across the link, which was
   *  built for a retired plan feature and kept precisely because "anything
   *  later that has to follow a person rather than a cookie needs exactly
   *  this". */
  linkedVendorId: string | null;
}
