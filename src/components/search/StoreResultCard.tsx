import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Store as StoreIcon, Wrench } from "lucide-react";
import { ProtectedImage } from "@/components/ProtectedImage";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import { VendorDetailModal } from "@/components/VendorDetailModal";
import { reportLead } from "@/lib/reportLead";
import { useUserStore } from "@/store/userStore";
import { buildWhatsappLink } from "@/lib/whatsapp";
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
  // Undefined/0 when this store has no matching service listings at all —
  // the link below only renders when there's something for it to open.
  // The panel itself isn't rendered here (see SearchHome.tsx's
  // MatchingServicesThread) — a carousel slide is too narrow for the
  // thread's own layout, so it renders full-width below the whole
  // carousel instead, this link just toggles it open/closed.
  matchingServicesCount,
  matchingServicesOpen = false,
  onToggleMatchingServices,
}: {
  match: StoreMatch;
  searchQuery?: string | null;
  matchingServicesCount?: number;
  matchingServicesOpen?: boolean;
  onToggleMatchingServices?: () => void;
}) {
  const chatHref = buildWhatsappLink(
    match.whatsapp,
    searchQuery
      ? `Hi ${match.name}! I found you on Velte — I'm looking for ${withArticle(searchQuery)}, are you able to help?`
      : `Hi ${match.name}! I found you on Velte and I'm interested in what you offer.`,
  );
  // A logged-in vendor can match their own storefront — no WhatsApp CTA to
  // themselves (which would also bill them a lead), just say so.
  const currentUserId = useUserStore((s) => s.user?.id);
  const isOwn = currentUserId != null && currentUserId === match.vendorId;

  // "See more" opens VendorDetailModal (full description + every sector +
  // location) instead of expanding text in place — only offered when
  // there's actually more than the compact card already shows (a clipped
  // description, or sectors beyond the 3 already visible below).
  const [detailOpen, setDetailOpen] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setDescOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [match.description]);
  const hasMore = descOverflows || match.sectors.length > 3;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-orange-50 overflow-hidden flex items-center justify-center shrink-0">
          {match.avatar ? (
            <ProtectedImage
              src={optimizedImageUrl(match.avatar)}
              alt={match.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <StoreIcon size={16} className="text-orange-500" />
          )}
        </div>
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-1 min-w-0">
          {match.name}
        </p>
      </div>

      {(() => {
        const seeMoreButton = hasMore && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDetailOpen(true);
            }}
            // Underlined so it reads as a link on sight, not just orange
            // text — found live: sitting close to the sector pills below
            // (also orange), plain color alone wasn't enough to tell them
            // apart.
            className="text-[12px] font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 w-fit"
          >
            See more
          </button>
        );
        if (!match.description) return seeMoreButton;
        // A negative margin on the button alone can't reliably win against
        // the outer card's own space-y-2.5 rhythm — Tailwind's space-y
        // sibling rule and a plain margin utility land at the same
        // specificity, so which one visually "wins" isn't dependable
        // (found live: it silently didn't). Nesting description + "See
        // more" in their OWN tightly-spaced sub-container sidesteps that
        // fight entirely — the outer space-y-2.5 only ever sees this
        // wrapper as ONE item, never reaching inside it, so the gap
        // between the two is real CSS here, not a margin fighting another
        // margin for control.
        return (
          <div className="space-y-0.5">
            <p
              ref={descRef}
              className="text-[13px] text-gray-500 leading-relaxed line-clamp-2"
            >
              {match.description}
            </p>
            {seeMoreButton}
          </div>
        );
      })()}

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

      {Boolean(matchingServicesCount) && onToggleMatchingServices && (
        // A hairline divider + extra top padding, on top of the underline,
        // is what actually separates this from the sector pills directly
        // above — both are orange and sit right next to each other, and
        // color alone didn't read as "this one's a link, those are tags."
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMatchingServices();
          }}
          className="w-fit flex items-center gap-1.5 text-[12px] font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 pt-2 mt-0.5 border-t border-gray-100"
        >
          <Wrench size={12} className="shrink-0" />
          {matchingServicesOpen
            ? "Hide matching service" + (matchingServicesCount === 1 ? "" : "s")
            : `View matching service${matchingServicesCount === 1 ? "" : "s"} (${matchingServicesCount})`}
        </button>
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
        <div className="flex flex-col gap-2 mt-1">
          {chatHref && (
            <WhatsAppButton
              href={chatHref}
              label="Chat on WhatsApp"
              className="w-full"
              onClick={() => reportLead(match.vendorId, undefined, "search")}
            />
          )}
          <Link
            href={`/store/${match.handle}`}
            target="_blank"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            <StoreIcon size={15} />
            View Store
          </Link>
        </div>
      )}

      <VendorDetailModal
        item={{
          name: match.name,
          handle: match.handle,
          description: match.description,
          sectors: match.sectors,
          area: match.area,
          state: match.state,
          distanceKm: match.distanceKm,
          avatar: match.avatar,
          gallery: match.gallery,
        }}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        isOwn={isOwn}
        chatHref={chatHref}
        onChatClick={() => reportLead(match.vendorId, undefined, "search")}
      />
    </div>
  );
}
