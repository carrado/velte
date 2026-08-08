import type { MetadataRoute } from "next";
import { listStoreHandlesForSitemap } from "@/lib/server/store";

// Forces this route to render dynamically (per-request) instead of Next's
// default attempt to statically generate it at build time. Without this,
// listStoreHandlesForSitemap()'s backendData() call — which always fetches
// with `cache: "no-store"` (see backend.ts's doFetch) — trips Next's
// DYNAMIC_SERVER_USAGE bail-out mid static-generation. That's a special
// framework control-flow error (digest: "DYNAMIC_SERVER_USAGE"), not an
// ordinary one: the try/catch below around the store fetch was silently
// swallowing it as if it were a real backend hiccup, letting the route
// "successfully" statically freeze with ZERO store entries baked in —
// every vendor storefront silently missing from what Google actually
// crawls, indefinitely, until the next full deploy. `force-dynamic` makes
// the always-fresh fetch and the route's own rendering mode agree, so
// there's nothing left to bail out of.
export const dynamic = "force-dynamic";

const SITE_URL = "https://velte.ng";

const STATIC_ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/velux", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.6 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
  { path: "/careers", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Every vendor storefront is real, unique, indexable content — the
  // long-tail pages actually worth ranking for "X near me" searches. A
  // backend hiccup here degrades to just the static pages rather than
  // failing the whole sitemap (better a smaller sitemap than none at all).
  let storeEntries: MetadataRoute.Sitemap = [];
  try {
    const stores = await listStoreHandlesForSitemap();
    storeEntries = stores.map((s) => ({
      url: `${SITE_URL}/store/${s.handle}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (err) {
    console.error("[sitemap] failed to fetch store handles:", err);
  }

  return [...staticEntries, ...storeEntries];
}
