/** Main image first, then whatever else was uploaded — every gallery
 *  (search cards, the public store page, the marketplace preview) resolves
 *  its image set the same way, so a listing with extra photos is never
 *  stuck showing just whichever one happened to be set as "main". */
export function resolveGalleryImages(
  mainImageUrl: string | null,
  thumbnailUrls: string[],
): string[] {
  return [mainImageUrl, ...thumbnailUrls].filter((url): url is string =>
    Boolean(url),
  );
}

/**
 * Builds a generic media URL using the /api/media proxy.
 * Can be used across all components for user-uploaded images (products, avatars, adverts, gigs, etc.).
 */
export function getMediaUrl(
  source: string | null | undefined,
  options?: { raw?: boolean; mask?: boolean },
): string {
  if (!source) return "";
  if (source.startsWith("/api/media") || source.startsWith("/api/hub/media")) {
    return source;
  }
  const params = new URLSearchParams();
  params.set("ref", source);
  if (options?.raw) params.set("raw", "1");
  if (options?.mask) params.set("mask", "1");
  return `/api/media?${params.toString()}`;
}

/**
 * Returns a fully-qualified URL for OpenGraph, Twitter, and Schema.org metadata.
 */
export function formatMetadataImageUrl(
  img?: string | null,
): string | undefined {
  if (!img) return undefined;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return `https://velte.ng/api/media?ref=${encodeURIComponent(img)}&raw=1`;
}
