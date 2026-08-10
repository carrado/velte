export interface UpdateEntry {
  slug: string;
  title: string;
  dek: string;
  /** ISO date string (YYYY-MM-DD) — kept as plain text, not a Date, since
   * these are hand-authored entries, not data from an API. */
  publishedAt: string;
}
