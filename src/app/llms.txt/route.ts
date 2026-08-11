import { blogPosts } from "@/lib/blog";

// llms.txt (see llmstxt.org) — a plain-text index of the site's real
// content aimed at AI crawlers/answer engines (ChatGPT, Perplexity, Google's
// AI Overviews, Claude, etc.), the same way sitemap.xml is aimed at
// classic search crawlers. Not a ranking mechanism by itself — it just
// gives these systems a clean, low-noise map of what's actually worth
// reading instead of them having to infer it from the rendered site.
// Blog section is generated from lib/blog.ts so a new post shows up here
// automatically, same convention as sitemap.ts.
export const dynamic = "force-static";

const SITE_URL = "https://velte.ng";

export async function GET() {
  const blogLines = blogPosts
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map(
      (post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.dek}`,
    )
    .join("\n");

  const body = `# Velte

> Velte is a marketplace and AI discovery engine for Nigeria: a buyer describes what they need (text or a photo), or browses real listings directly, and is matched to the nearest real vendor who actually has it — by meaning, proximity, and trust. Every vendor, price, and stock figure comes straight from Velte's database; nothing is invented. Buyers hand off to the vendor directly on WhatsApp, no in-app messaging or middleman.

## Search
- [Ask Velux](${SITE_URL}/velux): Velte's AI shopping assistant — describe what you need in your own words or a photo, matched against real vendor inventory nearby.
- [Browse the marketplace](${SITE_URL}/): Real, current vendor listings, browsable without searching.

## Company
- [About](${SITE_URL}/about): What Velte is, who it's for, and how buyer/seller matching works.
- [Pricing](${SITE_URL}/pricing): Free to list for vendors; pay only per matched lead, no subscription.
- [FAQ](${SITE_URL}/faq): Common buyer and vendor questions, answered directly.
- [Contact](${SITE_URL}/contact)

## Blog
${blogLines}

## For vendors
- [List your business](${SITE_URL}/auth/signup): Free to list — buyers searching nearby are matched to you automatically, no ads or bidding for placement.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
