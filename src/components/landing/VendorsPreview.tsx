"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { BadgeCheck, Store as StoreIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProtectedImage } from "@/components/ProtectedImage";
import { AskVeluxButton } from "@/components/AskVeluxButton";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { reportLead } from "@/lib/reportLead";
import type { VendorPreviewItem } from "@/types/store";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const SLIDE_INTERVAL_MS = 3200;

// The card's own "cover photo" — the store's gallery, actually sliding
// (translateX + a CSS transition, not a cross-fade) rather than a single
// static banner, per the ask. Falls back to a plain gradient tile when the
// vendor hasn't uploaded any gallery photos yet, and skips the auto-advance
// timer entirely for 0-1 images — nothing to slide between. Exported —
// VendorDetailModal (a search result's "See more") reuses this directly for
// the same reason MarketplaceCard/VendorCard themselves are exported: one
// cover implementation, not a second copy that drifts.
export function SlidingCover({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-orange-400/30 via-orange-300/20 to-[#023337]/10" />
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <ProtectedImage
            key={src + i}
            src={optimizedImageUrl(src)}
            alt={`${name} — photo ${i + 1}`}
            className="w-full h-full object-cover shrink-0"
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 right-2.5 flex gap-1">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-3.5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Exported — the /marketplace browse page reuses this directly (same
// reasoning as MarketplacePreview's MarketplaceCard export: one card, not a
// second copy that drifts).
export function VendorCard({ item }: { item: VendorPreviewItem }) {
  const chatHref = buildWhatsappLink(
    item.whatsapp,
    `Hi ${item.name}! I found your store on Velte.`,
  );
  // "+N more" is a real toggle, not a static label — clicking it reveals
  // the rest of the vendor's sectors in place rather than sending the
  // buyer anywhere else. Once expanded, extraSectors is 0 so the button
  // itself naturally disappears (nothing left to reveal).
  const [showAllSectors, setShowAllSectors] = useState(false);
  const shownSectors = showAllSectors ? item.sectors : item.sectors.slice(0, 2);
  const extraSectors = item.sectors.length - shownSectors.length;

  // Same overflow-detection technique as shared.tsx's OfferingCard (public
  // store page) — only offer "See more" when the description actually got
  // clipped by its own 2-line clamp, never as a pointless toggle on a
  // description that already fits.
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setDescOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [item.description]);

  return (
    // A plain div, not motion.div — dropped the scroll-triggered fadeUp
    // reveal (see MarketplacePreview.tsx's MarketplaceCard for the same
    // fix and why: animating many cards' opacity/y transforms WHILE the
    // buyer's own manual scroll moves the page read live as "distorted"
    // cards). Hover lift is plain CSS below, untouched.
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col h-full">
      {/* Twitter-style profile layout: a wide, short cover strip with the
          avatar overlapping its bottom edge, rather than a top-down stacked
          image+name card like the product grid above. */}
      <div className="relative h-24 bg-gray-100 shrink-0">
        <SlidingCover images={item.gallery} name={item.name} />
      </div>

      {/* flex-1 + the button row's own mt-auto below (same pattern as
          shared.tsx's OfferingCard) — View Store / Chat stay pinned to the
          card's bottom edge regardless of how tall the description or the
          expanded sector list above happens to be, instead of drifting
          wherever the content above happens to end. */}
      <div className="px-4 pb-4 flex flex-col flex-1">
        <div className="relative -mt-8 mb-2">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-50 border-4 border-white shadow-sm flex items-center justify-center">
            {item.avatar ? (
              <ProtectedImage
                src={optimizedImageUrl(item.avatar)}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <StoreIcon size={22} className="text-gray-300" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 min-w-0">
          <p className="font-bold text-[#023337] text-[15px] truncate">
            {item.name}
          </p>
          <BadgeCheck
            size={15}
            className="text-orange-500 shrink-0 fill-orange-500/15"
          />
        </div>
        <p className="text-xs text-gray-400 mb-2">@{item.handle}</p>

        {item.description && (
          <div className="mb-2.5">
            <p
              ref={descRef}
              className={cn(
                "text-[13px] text-gray-500 leading-relaxed",
                !descExpanded && "line-clamp-2",
              )}
            >
              {item.description}
            </p>
            {descOverflows && (
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-0.5 text-[11px] font-semibold text-[#023337] hover:text-orange-600"
              >
                {descExpanded ? "See less" : "See more"}
              </button>
            )}
          </div>
        )}

        {shownSectors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {shownSectors.map((sector) => (
              <span
                key={sector}
                className="text-[11px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
              >
                {sector}
              </span>
            ))}
            {extraSectors > 0 && (
              <button
                type="button"
                onClick={() => setShowAllSectors(true)}
                className="text-[11px] font-semibold text-gray-400 hover:text-orange-600 transition-colors"
              >
                +{extraSectors} more
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
          <Link
            href={`/store/${item.handle}`}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            View Store
          </Link>
          {chatHref && (
            <WhatsAppButton
              href={chatHref}
              label="Chat"
              className="flex-1 !py-2 !text-xs"
              onClick={() => reportLead(item.vendorId, undefined, "browse")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// A vendor directory alongside the product/service grid (MarketplacePreview)
// — that section shows individual listings; this one shows who's actually
// behind them, so a buyer scanning the homepage sees real businesses, not
// just products in isolation. Renders nothing when the list is empty, same
// convention as MarketplacePreview.
export function VendorsPreview({ items }: { items: VendorPreviewItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="relative bg-white border-t border-gray-200 py-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
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
            Vendors on Velte
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-500 max-w-xl mx-auto"
          >
            Real businesses, verified and reachable — take a look around their
            stores.
          </motion.p>
        </motion.div>

        {/* Plain div — see VendorCard's own comment on why the
            scroll-triggered stagger reveal was dropped from this grid. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <VendorCard key={item.vendorId} item={item} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mt-10"
        >
          <AskVeluxButton
            label="Ask Velux"
            subtext="Looking for a specific business?"
          />
        </motion.div>
      </div>
    </section>
  );
}
