"use client";

/* eslint-disable @next/next/no-img-element */

import { fmt } from "@/lib/product-price";
import type { WatchCandidate } from "@/types/search";

// The "want me to keep an eye on these?" strip (2026-08-29).
//
// Replaces the per-card "Watch price" button. That button appeared on every
// card equally, which made it chrome — the buyer had to decide, ten times
// over, whether this was the one worth watching. Velte has already made that
// comparison one block above, so it says so instead, naming the two or three
// products it would actually watch.
//
// Deliberately NOT interactive. There is no checkbox, no "Watch" button, and
// nothing here to click: the buyer answers in the composer, in words, the
// same way they answer everything else Velte asks. That is what keeps this a
// conversation rather than a form growing inside one — and it is why the
// composer's placeholder changes while this is on screen (see SearchHome),
// which is the affordance doing the work a button would have done.
//
// The thumbnail is the point. "Watch the Tecno one" only works if the buyer
// can see which is which, and a price beside each is what makes a drop
// meaningful later.
export function WatchOffer({ candidates }: { candidates: WatchCandidate[] }) {
  if (candidates.length === 0) return null;

  return (
    // Container-less, same as RecommendationPicks — this is Velte still
    // talking, and every one of its messages reads as plain text in the
    // thread. A panel here would have made the one message that offers a
    // paid feature look like an advert dropped into the conversation.
    <div className="mt-3 space-y-2">
      <ul className="space-y-2">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="flex items-center gap-3">
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {candidate.imageUrl ? (
                <img
                  src={candidate.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#023337]">
                {candidate.label}
              </span>
              <span className="block text-xs text-gray-500">
                {/* Kobo back to naira for display — the whole pipeline stores
                    kobo, and this is the only place it is read by a human. */}
                {fmt(candidate.priceKobo / 100, "₦")}
                {candidate.merchant ? ` · ${candidate.merchant}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
