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
