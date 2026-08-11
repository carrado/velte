import type { Metadata } from "next";
import { blogPosts } from "@/lib/blog";
import BlogIndexContent from "./_components/BlogIndexContent";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and stories for buyers and small-business vendors in Nigeria — selling online, growing on WhatsApp, and finding what you need nearby.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Velte Blog",
    description:
      "Guides and stories for buyers and small-business vendors in Nigeria.",
    url: "/blog",
  },
};

const SITE_URL = "https://velte.ng";

// Blog structured data — lists each post so Google can associate them with
// the site as a collection, built straight from the same array the index
// page renders (never a second, separate copy that could drift).
const blogJsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Velte Blog",
  url: `${SITE_URL}/blog`,
  blogPost: blogPosts.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    description: post.dek,
    ...(post.image ? { image: [post.image.src] } : {}),
    datePublished: post.publishedAt,
    url: `${SITE_URL}/blog/${post.slug}`,
  })),
};

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <BlogIndexContent />
    </>
  );
}
