import type { MetadataRoute } from "next";

const SITE_URL = "https://velte.ng";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API routes and the dashboard/BFF surface — no SEO value, and the
        // dashboard is auth-gated anyway (nothing meaningful for a crawler
        // to render there without a session).
        disallow: ["/api/", "/auth/", "/payment/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
