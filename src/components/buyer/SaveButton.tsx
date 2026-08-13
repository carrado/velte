"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedItems, type SavedKind } from "@/hooks/useSavedItems";

/* The heart overlay passed into MarketplaceCard/VendorCard's optional
 * saveSlot — only ever rendered from buyer-dashboard surfaces (Discover,
 * Saved, Home), never from the public marketplace/homepage, so tapping it
 * always has a buyer session (or the auth-gate replay in useSavedItems) to
 * fall back on. Stops propagation — these cards are full-card links, and a
 * tap on the heart must never also trigger the card's own navigation. */
export function SaveButton({
  kind,
  targetId,
  className,
}: {
  kind: SavedKind;
  targetId: string;
  className?: string;
}) {
  const { isSaved, toggle, isToggling } = useSavedItems();
  const saved = isSaved(kind, targetId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(kind, targetId);
      }}
      disabled={isToggling}
      aria-label={saved ? "Remove from saved" : "Save"}
      aria-pressed={saved}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full bg-black/45 backdrop-blur-sm text-white hover:bg-black/60 transition-colors disabled:opacity-60 cursor-pointer",
        className,
      )}
    >
      <Heart size={13} className={saved ? "fill-white" : ""} />
    </button>
  );
}
