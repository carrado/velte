import { MapPin, Store as StoreIcon } from "lucide-react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import { reportLead } from "@/lib/reportLead";
import { useUserStore } from "@/store/userStore";
import type { StoreMatch } from "@/types/search";

// Prefix "phone repair shop" → "a phone repair shop", "electronics store" →
// "an electronics store" — a light grammar touch for the WhatsApp message
// below, not real NLP; good enough for the short noun phrases businessType
// actually contains (see systemPrompt.ts's searchStores examples).
function withArticle(phrase: string): string {
  return /^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`;
}

// A business/vendor match — distinct from VendorResultCard (a specific
// product listing): no price/image-per-product fields, since this is a
// storefront, not a listing.
export function StoreResultCard({
  match,
  // The businessType actually searched for (e.g. "tailor") — only passed
  // when this card is a PURE vendor/store result (no product attached to
  // the same turn); customizes the WhatsApp message instead of the generic
  // "interested in what you offer." Omit/null for every other usage
  // (productStores, or a dual-intent turn that already has a product).
  searchQuery = null,
}: {
  match: StoreMatch;
  searchQuery?: string | null;
}) {
  const chatHref = match.whatsapp
    ? `https://wa.me/${match.whatsapp}?text=${encodeURIComponent(
        searchQuery
          ? `Hi ${match.name}! I found you on Velte — I'm looking for ${withArticle(searchQuery)}, are you able to help?`
          : `Hi ${match.name}! I found you on Velte and I'm interested in what you offer.`,
      )}`
    : null;
  // A logged-in vendor can match their own storefront — no WhatsApp CTA to
  // themselves (which would also bill them a lead), just say so.
  const currentUserId = useUserStore((s) => s.user?.id);
  const isOwn = currentUserId != null && currentUserId === match.vendorId;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
          <StoreIcon size={16} className="text-orange-500" />
        </div>
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-1 min-w-0">
          {match.name}
        </p>
      </div>

      {match.description && (
        <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
          {match.description}
        </p>
      )}

      {match.sectors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {match.sectors.slice(0, 3).map((sector) => (
            <span
              key={sector}
              className="text-[11px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
            >
              {sector}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <MapPin size={13} className="shrink-0" />
        <span className="truncate">
          {match.area ??
            match.state ??
            (match.distanceKm != null ? "Nearby" : "Nigeria")}
          {match.distanceKm != null && ` · ${match.distanceKm}km away`}
        </span>
      </div>

      {isOwn ? (
        <OwnListingBadge label="This is your store" />
      ) : (
        chatHref && (
          <WhatsAppButton
            href={chatHref}
            label="Chat on WhatsApp"
            className="w-full mt-1"
            onClick={() => reportLead(match.vendorId)}
          />
        )
      )}
    </div>
  );
}
