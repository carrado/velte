import type { Metadata } from "next";
import { blogPosts } from "@/lib/blog";
import FindTrustedVendorsContent, {
  FAQS,
} from "./_components/FindTrustedVendorsContent";

const TITLE = "How to Find Real, Trusted Vendors Near You in Nigeria";
const DESCRIPTION =
  "A practical checklist for verifying an online seller in Nigeria before you pay — real storefronts, proof requests, red flags to avoid, and how proximity-and-trust matching lowers the risk.";
const SITE_URL = "https://velte.ng";
const PATH = "/blog/find-trusted-vendors-near-you-nigeria";
const PUBLISHED_AT = "2026-08-11";
// Reuses lib/blog.ts's own entry for this post's photo rather than a third
// copy of the same Unsplash URL.
const POST_IMAGE = blogPosts.find(
  (p) => p.slug === "find-trusted-vendors-near-you-nigeria",
)?.image;

export const metadata: Metadata = {
  title: `${TITLE} — Velte Blog`,
  description: DESCRIPTION,
  alternates: {
    canonical: PATH,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    type: "article",
    publishedTime: PUBLISHED_AT,
    // No `images` here on purpose — Next auto-attaches this route's
    // opengraph-image.tsx (a branded card with the headline baked in,
    // legible at social-preview thumbnail sizes) instead of the raw
    // editorial photo used elsewhere on the page.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// BlogPosting structured data, eligible for Google's Article rich result.
// `image` points at the same editorial photo used in the article body
// rather than the branded opengraph-image.tsx card (that one's for social
// link-preview thumbnails specifically).
const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: TITLE,
  description: DESCRIPTION,
  ...(POST_IMAGE ? { image: [POST_IMAGE.src] } : {}),
  datePublished: PUBLISHED_AT,
  dateModified: PUBLISHED_AT,
  url: `${SITE_URL}${PATH}`,
  author: {
    "@type": "Organization",
    name: "Velte",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "Velte",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/velte_manifest.png`,
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `${SITE_URL}${PATH}`,
  },
};

// FAQPage structured data — eligible for Google's FAQ rich result, built
// straight from the same FAQS array the page renders (never a second,
// separate copy of the copy that could drift).
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function FindTrustedVendorsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FindTrustedVendorsContent />
    </>
  );
}
