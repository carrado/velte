"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  descriptionQuality,
  DESCRIPTION_QUALITY_COPY,
  type DescriptionQuality,
} from "@/lib/description-quality";
import { LoaderIcon } from "@/components/icons";

// How long to wait after the vendor stops typing before spending an LLM
// call on it — a quality check on every keystroke would be both wasteful
// and would fire mid-word, before there's anything meaningful to judge.
const CHECK_DEBOUNCE_MS = 5000;

interface Assessment {
  quality: DescriptionQuality;
  hint: string;
}

// Same visual pattern as passwordStrengthMeter.tsx — a thin bar + label,
// hidden entirely until there's something to grade. Used on both the Store
// editor's "What do you do?" field and signup's business description field.
//
// The character-count heuristic (description-quality.ts) is a FALLBACK for
// when the real check fails, not a preview shown by default — found live: a
// vendor saw an instant colored "Good" from length alone that could then
// flip once the real AI check ran a few seconds later (e.g. a description
// detailed for one sector but silent on three others the vendor also
// picked), which reads as the meter contradicting itself. So while waiting
// on /api/ai/description-quality (the whole ~5s debounce window, not just
// the in-flight request), this shows a neutral "checking" state instead of
// a colored verdict. Only once that call genuinely fails (no API key /
// network error) does the heuristic take over, as a permanent degraded
// mode rather than a placeholder.
export function DescriptionQualityMeter({
  description,
  sectorValues,
}: {
  description: string;
  /** Sector slugs (SECTOR_BY_VALUE keys) — grounds the AI check in what
   * this vendor actually does. Omit if not available yet. */
  sectorValues?: string[];
}) {
  const [aiAssessment, setAiAssessment] = useState<Assessment | null>(null);
  const [aiFailed, setAiFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const sectorKey = (sectorValues ?? []).join(",");

  useEffect(() => {
    // A stale verdict for a since-edited description would be actively
    // misleading — reset to "waiting" the moment text changes again, until
    // the next debounced check resolves (or fails).
    setAiAssessment(null);
    setAiFailed(false);
    setChecking(false);
    if (description.trim().length === 0) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch("/api/ai/description-quality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            sectorValues: sectorKey ? sectorKey.split(",") : [],
          }),
        });
        if (!cancelled) {
          if (res.ok) setAiAssessment((await res.json()) as Assessment);
          else setAiFailed(true);
        }
      } catch {
        if (!cancelled) setAiFailed(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [description, sectorKey]);

  if (description.trim().length === 0) return null;

  if (!aiAssessment && !aiFailed) {
    return (
      <div className="mt-1.5 space-y-1">
        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-gray-300 animate-pulse" />
        </div>
        <p className="text-dash-caption text-gray-400 flex items-center gap-1">
          {checking && (
            <LoaderIcon size={10} className="animate-spin shrink-0" />
          )}
          {checking
            ? "Checking your description…"
            : "We'll check your description in a moment…"}
        </p>
      </div>
    );
  }

  const quality = aiAssessment?.quality ?? descriptionQuality(description);
  const info = DESCRIPTION_QUALITY_COPY[quality];
  // "Good" always shows our own fixed reassurance rather than whatever the
  // model happened to phrase — there's nothing actionable left to say once
  // it's already good, so a consistent message beats phrasing variance.
  // "Weak"/"fair" keep the AI's own hint, since what's actually missing
  // differs per description and is worth surfacing specifically.
  const hint =
    quality === "good" ? info.hint : (aiAssessment?.hint ?? info.hint);

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", info.bar)}
          style={{ width: `${info.pct}%` }}
        />
      </div>
      <p className={cn("text-dash-caption", info.text)}>
        {info.label} — {hint}
      </p>
    </div>
  );
}
