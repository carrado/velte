"use client";

import { useParams } from "next/navigation";
import { useNavigation } from "@/components/NavigationProgressContext";
import { usePendingBuyerRequests } from "@/hooks/usePendingBuyerRequests";
import { ArrowRightIcon, SparklesIcon } from "@/components/icons/hero";

/* The scoped version of "Velte Demand" (2026-08-15) — per the earlier
   critique of building a full demand-analytics feature at 25-vendor scale,
   this is deliberately just a thin surfacing of buyer requests the vendor
   is ALREADY matched to (same query the Buyer Requests page itself uses,
   same queryKey so the two share one cache entry), not a new aggregation
   system. Lives at the top of the Products page — the vendor's actual
   landing page (proxy.ts sends them here, not to a separate dashboard
   overview that doesn't exist) — so "you have opportunities waiting" is the
   first thing a vendor sees, not something buried behind a nav click.
   Renders nothing at all when there's nothing to show: no request, no
   unresponded ones, or a fetch failure — this is a bonus nudge, never a
   layout shift a vendor has to account for. */
export function OpportunitiesBanner() {
  const params = useParams<{ id: string }>();
  const { navigate } = useNavigation();

  // The same count as the nav badge — open and unanswered only (the list
  // also carries answered history since 2026-09-24). One hook, so the banner
  // and the badge can never disagree.
  const pending = usePendingBuyerRequests();
  if (pending === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/${params.id}/buyer-requests`)}
      className="w-full flex items-center gap-3 bg-gradient-to-r from-orange-50 to-orange-50/40 border border-orange-100 rounded-2xl px-4 sm:px-5 py-3.5 text-left hover:border-orange-200 transition-colors cursor-pointer"
    >
      <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
        <SparklesIcon size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-dash-body font-semibold text-ink">
          {pending}{" "}
          {pending === 1 ? "buyer opportunity" : "buyer opportunities"} waiting
        </p>
        <p className="text-dash-caption text-gray-500 truncate">
          {pending === 1
            ? "Someone near you is looking for what you sell."
            : "People near you are looking for what you sell."}
        </p>
      </div>
      <ArrowRightIcon size={16} className="text-orange-500 shrink-0" />
    </button>
  );
}
