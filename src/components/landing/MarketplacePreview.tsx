"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { BadgeCheck, Store as StoreIcon, Wrench, Package } from "lucide-react";
import { ProtectedImage } from "@/components/ProtectedImage";
import { AskVeluxButton } from "@/components/AskVeluxButton";
import { fmt } from "@/lib/product-price";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
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
function MarketplaceCard({ item }: { item: MarketplacePreviewItem }) {
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

  return (
    // A plain div, not motion.div — this used to carry a scroll-triggered
    // fadeUp reveal (opacity/y driven by the grid's own whileInView
    // stagger below), but animating many cards' transforms WHILE the
    // buyer's own manual scroll is also moving the page compositor read
    // live as "distorted" cards, not a polished reveal. The hover lift is
    // untouched — it was always plain CSS (hover:shadow-lg + the
    // hover:-translate-y-0.5 below), never motion-driven.
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col">
      <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
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
      </div>
      <div className="p-3.5 flex flex-col flex-1 gap-1">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5em]">
          {item.name}
        </p>
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
          <BadgeCheck
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
    </div>
  );
}

// A flat, Instagram-shop-style preview of the real marketplace catalog —
// deliberately browse-first, not AI search. Decided 2026-08-05: at 14
// vendors / ~17 listings, /search alone (a blind text box, zero pre-search
// content) wasn't converting existing vendors into sales — an open-ended
// query over a thin catalog misses more often than it hits. This gives
// buyers something real to look at and chat about immediately; "See more"
// hands off to /search, which stays the deeper AI-assisted discovery layer
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

  return (
    // scroll-mt-20 — the fixed Navbar (h-16) would otherwise sit right on
    // top of this section's own heading once scrolled here (see
    // scrollToMarketplace / the mount effect above).
    <section
      id="marketplace"
      className="relative bg-[#F1F5F9] border-t border-gray-200 py-20 scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-10"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold text-[#023337] tracking-tight mb-3 text-balance"
          >
            On the marketplace right now
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-500 max-w-xl mx-auto"
          >
            Real listings from real vendors — chat with them directly, or let AI
            find something more specific.
          </motion.p>
        </motion.div>

        {/* Plain div — see MarketplaceCard's own comment on why the
            scroll-triggered stagger reveal was dropped from this grid. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-2.5 gap-y-4 sm:gap-5 mb-10">
          {items.map((item) => (
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
          <AskVeluxButton label="Ask Velux" subtext="See more with AI search" />
        </motion.div>
      </div>
    </section>
  );
}
