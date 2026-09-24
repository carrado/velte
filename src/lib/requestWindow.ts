// A Buyer Request's open window, read by the buyer's "Your requests" page and
// both vendor pages. Computed from each request's own createdAt/expiresAt —
// never a hardcoded 48h, so changing BUYER_REQUEST_EXPIRY_HOURS in the
// backend cannot quietly make any of these lie.

const HOUR = 3_600_000;

/** Under this much time left, a vendor-facing countdown turns urgent. */
export const URGENT_MS = 6 * HOUR;

/** Rounded DOWN, deliberately: "3h left" that turns out to be 3h20m is a
 *  pleasant surprise; the other way round is a broken promise. */
export function timeLeft(expiresAt: string, now: number): string {
  const ms = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return "closing now";
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
  const hours = Math.floor(ms / HOUR);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

/** Milliseconds until the window closes (negative once it has). */
export function msLeft(expiresAt: string, now: number): number {
  return new Date(expiresAt).getTime() - now;
}

/** 0..1 — how much of the window has run. */
export function windowElapsed(
  createdAt: string,
  expiresAt: string,
  now: number,
): number {
  const started = new Date(createdAt).getTime();
  const ends = new Date(expiresAt).getTime();
  return ends > started
    ? Math.min(1, Math.max(0, (now - started) / (ends - started)))
    : 1;
}
