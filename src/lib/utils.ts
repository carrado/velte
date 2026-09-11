import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an amount in kobo as a Naira string, e.g. 1250000 → "₦12,500". */
export function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** "3h ago", "2d ago", falling back to a plain date past a week — moved here
 *  (2026-09-11) from RequestsPage.tsx's own local copy once PlansPage.tsx
 *  needed the identical thing, so both read a timestamp the same way rather
 *  than keeping two hand-rolled copies in sync by hand. `now` is passed in
 *  rather than read here so a caller re-rendering on a tick (a live list)
 *  recomputes from one shared clock instead of each row reading Date.now()
 *  at a slightly different instant. */
export function timeAgo(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((now - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
