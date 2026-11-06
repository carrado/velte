/**
 * Single-segment paths that are real app routes, not public product slugs.
 * Keep in sync with `proxy.ts` — that file rewrites `/{slug}` → `/p/[slug]`.
 */
export const ROOT_SEGMENTS = new Set([
  "about",
  "api",
  "auth",
  "blog",
  "buyer-requests",
  "careers",
  "cart",
  "chat",
  "contact",
  "faq",
  "how-it-works",
  "hub",
  "join",
  "launch",
  "marketplace",
  "notifications",
  "orders",
  "p",
  "payment",
  "pricing",
  "privacy",
  "products",
  "referrals",
  "reports",
  "s",
  "settings",
  "store",
  "terms",
  "track",
  "updates",
  "wallet",
  "welcome",
]);

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/** True when a path segment is a public product slug (not a reserved route or vendor ObjectId). */
export function isPublicProductSlug(segment: string): boolean {
  if (!segment || ROOT_SEGMENTS.has(segment)) return false;
  if (OBJECT_ID_RE.test(segment)) return false;
  return true;
}
