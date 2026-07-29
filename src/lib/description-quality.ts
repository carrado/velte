// A vendor with zero product/service listings is found in AI search ONLY
// through their store's own description (it's embedded independently of any
// listing — see staffly-ai-backend's store-level vector index), so a thin,
// generic description is a real risk of never surfacing, not just a
// cosmetic nicety. Deliberately coarse length-based tiers, same spirit as
// password-utils.ts's passwordStrength — a nudge while typing, not a strict
// validator. Shared between the Store editor and signup's business
// description field, since both write to the same field.
export type DescriptionQuality = "weak" | "fair" | "good";

export function descriptionQuality(text: string): DescriptionQuality {
  const len = text.trim().length;
  if (len < 40) return "weak";
  if (len < 120) return "fair";
  return "good";
}

export interface DescriptionQualityInfo {
  label: string;
  hint: string;
  bar: string;
  text: string;
  pct: number;
}

export const DESCRIPTION_QUALITY_COPY: Record<
  DescriptionQuality,
  DescriptionQualityInfo
> = {
  weak: {
    label: "Too short",
    hint: "Buyers can't find you in AI search without more detail — say what you actually sell or do, and the area you cover.",
    bar: "bg-red-500",
    text: "text-red-600",
    pct: 33,
  },
  fair: {
    label: "Getting there",
    hint: "A bit more helps — name specific items, services, or brands you carry.",
    bar: "bg-amber-500",
    text: "text-amber-600",
    pct: 66,
  },
  good: {
    label: "Good",
    hint: "This gives our AI enough to match you to buyers — even before you list anything.",
    bar: "bg-green-500",
    text: "text-green-600",
    pct: 100,
  },
};
