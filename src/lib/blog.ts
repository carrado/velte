import type { BlogPost } from "@/types/blog";

// SEO / content-marketing posts — separate from /updates (vendor policy
// notices linked from super-admin broadcasts) and /faq (support Q&A). Same
// zero-CMS pattern as /updates: each post is its own route folder with a
// hand-written `_components/*Content.tsx`, and this array only backs the
// index list at /blog plus the sitemap entries. Add a new object here + a
// new route folder for the next post — no CMS, no backend.
export const blogPosts: BlogPost[] = [
  {
    slug: "sell-on-whatsapp-nigeria",
    title: "How to Start Selling on WhatsApp in Nigeria: A Complete Guide",
    dek: "Turn your WhatsApp DMs into a real storefront — catalog, orders, and payments, without losing customers to chat chaos.",
    publishedAt: "2026-08-11",
    readingTime: "8 min read",
    category: "Guides",
    // Same photo as the homepage's own Hero.tsx (heroPhoto) — same subject
    // (a vendor's storefront + phone), already vetted for this site.
    // Photo credit: Ali Mkumbwa / Unsplash (unsplash.com/photos/H1KbBGUs4bM)
    // — Unsplash's license doesn't require attribution, kept for
    // maintainability.
    image: {
      src: "https://images.unsplash.com/photo-1687422808384-c896d0efd4ab",
      alt: "Woman standing in front of a store holding a cell phone",
    },
  },
  {
    slug: "find-trusted-vendors-near-you-nigeria",
    title: "How to Find Real, Trusted Vendors Near You in Nigeria",
    dek: "A practical checklist for verifying a seller before you pay — and how proximity-and-trust matching cuts the risk before it starts.",
    publishedAt: "2026-08-11",
    readingTime: "7 min read",
    category: "Guides",
    // Same photo as the homepage's own About page (AboutContent's
    // storyPhoto) — already vetted for this site, and directly on-theme
    // (a real vendor stall, not a stock "online shopping" photo).
    // Photo credit: Ben Iwara / Unsplash (unsplash.com/photos/w1EaPjX71Sw)
    // — two women at a food stall, Benin City, Nigeria. License doesn't
    // require attribution, kept for maintainability.
    image: {
      src: "https://images.unsplash.com/photo-1765584830351-b751c8937c75",
      alt: "Two women at a food stall, Benin City, Nigeria",
    },
  },
];
