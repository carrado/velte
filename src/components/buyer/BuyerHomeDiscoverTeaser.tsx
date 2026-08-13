"use client";

import { ArrowRight } from "lucide-react";

import { MarketplaceCard } from "@/components/landing/MarketplacePreview";
import { SaveButton } from "@/components/buyer/SaveButton";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import type { MarketplacePreviewItem } from "@/types/store";

const TEASER_COUNT = 6;

/* Home's "Discover nearby" row — a small taste of the catalog (the capped,
 * rotating homepage-preview feed, same one "/" uses — not the full
 * /buyer/discover browse), so Home stays a quick landing surface rather
 * than the heavy full-catalog grid that used to live here. "See all" is
 * the only way deeper; this never tries to be Discover itself. */
export function BuyerHomeDiscoverTeaser({
  items,
}: {
  items: MarketplacePreviewItem[];
}) {
  const { navigate } = useBuyerNavigation();
  if (items.length === 0) return null;
  const shown = items.slice(0, TEASER_COUNT);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-dash-heading font-bold text-gray-900">
          Discover nearby
        </h2>
        <button
          onClick={() => navigate("/buyer/discover")}
          className="inline-flex items-center gap-1 text-dash-caption font-semibold text-orange-600 cursor-pointer"
        >
          See all <ArrowRight size={12} />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {shown.map((item) => (
          <MarketplaceCard
            key={item.id}
            item={item}
            saveSlot={<SaveButton kind="product" targetId={item.id} />}
          />
        ))}
      </div>
    </div>
  );
}
