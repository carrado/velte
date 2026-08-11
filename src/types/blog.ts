export interface BlogPost {
  slug: string;
  title: string;
  dek: string;
  /** ISO date string (YYYY-MM-DD) — kept as plain text, not a Date, since
   * these are hand-authored entries, not data from an API. */
  publishedAt: string;
  /** Hand-set, not computed from word count — good enough for a display
   * hint and avoids pulling in a reading-time library for a handful of posts. */
  readingTime: string;
  /** Optional grouping for once there are enough posts to filter by —
   * unused by the index page today, kept so adding category filtering
   * later doesn't require a schema change. */
  category?: string;
  /** Absolute HTTPS URL, same convention as the marketing site's other
   * editorial photography (Hero.tsx's heroPhoto). Backs the index-page
   * thumbnail, this post's JSON-LD `image`, and its sitemap image entry —
   * one field instead of three separate copies of the same URL. */
  image?: { src: string; alt: string };
}
