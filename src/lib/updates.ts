import type { UpdateEntry } from "@/types/updates";

// Hand-authored vendor-facing policy/feature notices — the kind of thing a
// super-admin broadcast message links out to for "read the full details"
// (see BroadcastMessageView.vue in velte-super-admin). Each entry's content
// lives in its own `/updates/<slug>/_components/*Content.tsx`, matching the
// existing about/faq/careers page pattern; this array only backs the index
// list at /updates. Add a new object here + a new route folder for the next
// one — no CMS, no backend, source-controlled like everything else in this
// repo.
export const updates: UpdateEntry[] = [
  {
    slug: "wallet-bonuses",
    title: "How your wallet earns from listings and referrals",
    dek: "The ₦500 product-listing bonus and the updated ₦1,000 referral rule, explained.",
    publishedAt: "2026-08-10",
  },
];
