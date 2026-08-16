"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
// Icons from Phosphor (2026-08-16, swapped from lucide-react for this
// session's pages only — see MobileMenu.tsx's own comment). BadgeCheck,
// LayoutGrid and Store have no exact match; SealCheck, SquaresFour and
// Storefront are their closest Phosphor equivalents.
import {
  Images,
  Package,
  SealCheck,
  SquaresFour,
  Storefront as StoreIcon,
  Wrench,
} from "@phosphor-icons/react";
import { ProtectedImage } from "@/components/ProtectedImage";
import { fmt } from "@/lib/product-price";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { resolveGalleryImages } from "@/lib/media";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ListingDetailModal } from "@/components/ListingDetailModal";
import { ImageLightbox } from "@/components/ImageLightbox";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { reportLead } from "@/lib/reportLead";
import { MARKETPLACE_SCROLL_FLAG } from "@/lib/scrollToMarketplace";
import type { MarketplacePreviewItem } from "@/types/store";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

// Deliberately its own card, not a reuse of the /store/[handle] page's
// OfferingCard — that one is shaped for a single already-known store
// (description, attributes, a "See more" detail modal, an isOwn check that
// can never be true here since a logged-in vendor never reaches "/", see
// proxy.ts) and StoreProductCard (search results) assumes its heading
// already named the vendor. This card is flat and cross-vendor: an avatar +
// bold name + verified badge row IS the vendor context (not a "by {name}"
// text byline — every vendor on Velte is a real, onboarded business, same
// blanket "verified" framing Hero.tsx's own mockup already uses; there's no
// per-vendor verification flag behind it yet).
// Exported — the /marketplace browse page reuses this as-is (its items are
// a strict superset shape, MarketplaceBrowseItem extends
// MarketplacePreviewItem) rather than maintaining a second near-identical
// card that would inevitably drift from this one.
export function MarketplaceCard({
  item,
  saveSlot,
}: {
  item: MarketplacePreviewItem;
  /** Optional Save-heart overlay (top-right of the image) — only the buyer
   *  Discover/Saved pages pass this (a SaveButton), every public caller
   *  (homepage, /marketplace, search results) renders nothing here, same
   *  as before this prop existed. */
  saveSlot?: React.ReactNode;
}) {
  const symbol = item.currency === "USD" ? "$" : "₦";
  // Same raw-kobo convention as the public store page (shared.tsx's Price) —
  // this endpoint reads Product.price directly, unlike the AI search
  // pipeline, which already normalizes to naira server-side.
  const price = item.price / 100;
  const priceMax = item.priceMax != null ? item.priceMax / 100 : null;
  const isRange = priceMax != null && priceMax > price;
  const isService = item.kind === "service";
  const KindIcon = isService ? Wrench : Package;

  const chatHref = buildWhatsappLink(
    item.whatsapp,
    isService
      ? `Hi ${item.storeName}! I'm interested in your "${item.name}" service. I found you on Velte.`
      : `Hi ${item.storeName}! Is "${item.name}" still available? I found you on Velte.`,
    item.mainImageUrl ? item.id : undefined,
  );

  const images = resolveGalleryImages(item.mainImageUrl, item.thumbnailUrls);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  // Same overflow-detection technique as the public store page's OfferingCard
  // — only offer "See more" when the description actually got clipped by its
  // own 2-line clamp, never as a pointless toggle on a short description.
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setDescOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [item.description]);

  // Service-detail attributes never render on the card itself, and extra
  // photos beyond the main one aren't reachable from the card's own
  // (single-image) media area — either alone is reason enough to offer "See
  // more", even when the description itself is short/absent.
  const hasMore =
    descOverflows || item.attributes.length > 0 || images.length > 1;

  return (
    // A plain div, not motion.div — this used to carry a scroll-triggered
    // fadeUp reveal (opacity/y driven by the grid's own whileInView
    // stagger below), but animating many cards' transforms WHILE the
    // buyer's own manual scroll is also moving the page compositor read
    // live as "distorted" cards, not a polished reveal. The hover lift is
    // untouched — it was always plain CSS (hover:shadow-lg + the
    // hover:-translate-y-0.5 below), never motion-driven.
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col">
      <div
        className={`relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden ${item.mainImageUrl ? "cursor-zoom-in" : ""}`}
        onClick={() => item.mainImageUrl && setLightboxOpen(true)}
      >
        {item.mainImageUrl ? (
          <ProtectedImage
            src={optimizedImageUrl(item.mainImageUrl)}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <StoreIcon size={28} className="text-gray-300" />
        )}
        <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full">
          <KindIcon size={10} />
          {isService ? "Service" : "Product"}
        </span>
        {saveSlot && (
          <div className="absolute top-2 right-2 z-10">{saveSlot}</div>
        )}
        {images.length > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full">
            <Images size={10} />
            {images.length}
          </span>
        )}
      </div>
      <div className="p-3.5 flex flex-col flex-1 gap-1">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5em]">
          {item.name}
        </p>
        {item.description && (
          <p
            ref={descRef}
            className="text-[12px] text-gray-500 leading-relaxed line-clamp-2"
          >
            {item.description}
          </p>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDetailOpen(true);
            }}
            className="self-start text-[11px] font-semibold text-orange-600 hover:text-orange-700 underline"
          >
            See more
          </button>
        )}
        {item.quoteOnRequest ? (
          <p className="text-[14px] font-extrabold text-[#023337]">
            Contact for quote
          </p>
        ) : (
          <p className="text-[14px] font-extrabold text-[#023337]">
            {fmt(price, symbol)}
            {isRange && (
              <>
                <span className="mx-1 text-sm font-normal text-gray-400">
                  –
                </span>
                {fmt(priceMax!, symbol)}
              </>
            )}
          </p>
        )}
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
            {item.storeAvatar ? (
              <ProtectedImage
                src={optimizedImageUrl(item.storeAvatar)}
                alt={item.storeName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[9px] font-bold text-gray-400">
                {item.storeName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-gray-700 truncate min-w-0">
            {item.storeName}
          </span>
          <SealCheck
            size={13}
            className="text-orange-500 shrink-0 fill-orange-500/15"
          />
        </div>
        {chatHref && (
          <WhatsAppButton
            href={chatHref}
            label="Chat"
            className="w-full mt-auto !py-2 !text-xs"
            onClick={() => reportLead(item.vendorId, item.id, "browse")}
          />
        )}
      </div>

      <ListingDetailModal
        item={{
          name: item.name,
          kind: item.kind,
          quoteOnRequest: item.quoteOnRequest,
          price: item.price,
          priceMax: item.priceMax,
          currency: item.currency,
          images,
          description: item.description,
          attributes: item.attributes,
        }}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        // A logged-in vendor never reaches "/" (see proxy.ts) — this card's
        // own isOwn is always false, unlike the public store page's
        // OfferingCard, which a vendor CAN land on (their own storefront).
        isOwn={false}
        chatHref={chatHref}
        chatLabel="Chat"
        onChatClick={() => reportLead(item.vendorId, item.id, "browse")}
      />

      <ImageLightbox
        images={images}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={item.name}
      />
    </div>
  );
}

// A flat, Instagram-shop-style preview of the real marketplace catalog —
// deliberately browse-first, not AI search. Decided 2026-08-05: at 14
// vendors / ~17 listings, /chat alone (a blind text box, zero pre-search
// content) wasn't converting existing vendors into sales — an open-ended
// query over a thin catalog misses more often than it hits. This gives
// buyers something real to look at and chat about immediately; "See more"
// hands off to /chat, which stays the deeper AI-assisted discovery layer
// for once the catalog is big enough to lean on fully.
//
// Renders nothing when the catalog is empty (rather than an empty section)
// — a backend hiccup or a genuinely empty catalog shouldn't show a
// headline over a blank grid.
export function MarketplacePreview({
  items,
}: {
  items: MarketplacePreviewItem[];
}) {
  // Consumes the one-shot flag scrollToMarketplace() leaves before
  // navigating here from another page — see that file's own comment. Above
  // the early return below (hooks can't be conditional), even though this
  // component renders nothing when items is empty: a genuinely empty
  // catalog means there's nothing to scroll to anyway, so the flag just
  // goes unconsumed and clears itself out next successful visit.
  useEffect(() => {
    let flagged = false;
    try {
      flagged = sessionStorage.getItem(MARKETPLACE_SCROLL_FLAG) === "1";
      if (flagged) sessionStorage.removeItem(MARKETPLACE_SCROLL_FLAG);
    } catch {
      return;
    }
    if (flagged) {
      document
        .getElementById("marketplace")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  if (items.length === 0) return null;

  // Capped at 6 on the homepage (2026-08-15) — this used to show every item
  // the endpoint returned (up to 12), which read as "Velte is basically a
  // product marketplace" before the visitor ever reached the Request/Velux/
  // Compare story below. The full catalog is one tap away via "Explore the
  // marketplace" below; this teaser's only job is proving there's real
  // inventory, not being the inventory browser itself.
  const shown = items.slice(0, 6);

  return (
    // scroll-mt-20 — the fixed Navbar (h-16) would otherwise sit right on
    // top of this section's own heading once scrolled here (see
    // scrollToMarketplace / the mount effect above).
    <section
      id="marketplace"
      className="relative bg-[#F1F5F9] border-t border-gray-100 py-12 sm:py-16 scroll-mt-20"
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-7"
        >
          <motion.h2
            variants={fadeUp}
            className="text-2xl sm:text-3xl font-bold text-[#023337] tracking-tight text-balance"
          >
            Discover what&apos;s available near you
          </motion.h2>
        </motion.div>

        {/* Plain div — see MarketplaceCard's own comment on why the
            scroll-triggered stagger reveal was dropped from this grid. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2.5 gap-y-4 sm:gap-5 mb-8">
          {shown.map((item) => (
            <MarketplaceCard key={item.id} item={item} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          {/* A real "second primary" CTA (2026-08-15) — tried muting this to
              plain gray text first, but that undersold it: browsing is
              this whole section's actual point (see MarketplacePreview's
              own "browse-first converts better" comment further up), so
              the exit off a 6-item teaser deserves a genuine button, not a
              barely-visible link. Outlined rather than solid orange so it
              still reads as secondary to Hero's composer / Join Velte
              without disappearing. Border lightened 2px orange-500 → 1px
              orange-200 (2026-08-16, same change as VendorsPreview's
              matching CTA and the two other secondary CTAs on the page,
              VeluxShowcase/FAQ) — the bold 2px border read heavier than a
              secondary action needed. */}
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-orange-200 bg-orange-50 text-orange-600 font-semibold text-sm hover:border-orange-300 hover:bg-orange-100 transition-colors"
          >
            Explore the marketplace
            <SquaresFour size={14} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
