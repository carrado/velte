// The plan data the /plans page renders. A plain, serialisable mirror of
// lib/server/ai/plans.ts — that module is server-only (it feeds the
// enforcement path), so the page reads it on the server and hands this
// across the boundary rather than letting a client component import it.
export interface PlanCard {
  id: string;
  name: string;
  priceNgnMonthly: number;
  priceNgnYearly: number | null;
  textSearches: number;
  photoSearches: number;
  priceWatches: number;
  /** -1 = unlimited. */
  savedLists: number;
  /** -1 = forever. */
  historyDays: number;
}
