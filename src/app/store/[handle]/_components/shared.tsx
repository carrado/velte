"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MessageCircle,
  Package,
  Store as StoreIcon,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/product-price";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import { reportLead } from "@/lib/reportLead";
import { buildWhatsappLink } from "@/lib/whatsapp";
import type {
  PublicStoreProduct,
  PublicStoreProductProps,
} from "@/types/store";

// "use client" so the server page (page.tsx) can still import/render these
// across the server/client boundary while StoreWhatsAppButton attaches a
// real onClick — a Server Component can't pass an inline event handler to
// a prop itself, but it CAN render an already-client component that owns
// its own handler internally, which is exactly what this is for.

/** Wraps WhatsAppButton with the same lead-billing beacon the search
 * result cards use (see reportLead) — every "chat with vendor" touchpoint
 * on the public store page should bill the same way theirs does.
 * `productId` omitted = a store-level enquiry, not tied to one listing. */
export function StoreWhatsAppButton({
  href,
  label,
  className,
  vendorId,
  productId,
}: {
  href: string;
  label: string;
  className?: string;
  vendorId: string;
  productId?: string;
}) {
  return (
    <WhatsAppButton
      href={href}
      label={label}
      className={className}
      onClick={() => reportLead(vendorId, productId)}
    />
  );
}

// Shared, non-interactive pieces used by both the server page (header CTAs,
// Intro sidebar) and the client StoreTabs component (catalog panels).

/** A listing prices as a range when it carries a `priceMax` above `price`. */
function isRange(product: PublicStoreProduct): boolean {
  return product.priceMax != null && product.priceMax > product.price;
}

export function Price({ product }: { product: PublicStoreProduct }) {
  const symbol = product.currency === "USD" ? "$" : "₦";
  if (product.quoteOnRequest)
    return (
      <p className="text-[15px] font-extrabold text-[#023337]">
        Contact for quote
      </p>
    );
  return (
    <p className="text-[15px] font-extrabold text-[#023337]">
      {fmt(product.price / 100, symbol)}
      {isRange(product) && (
        <>
          <span className="mx-1 text-sm font-normal text-gray-400">–</span>
          {fmt(product.priceMax! / 100, symbol)}
        </>
      )}
    </p>
  );
}

function enquireHrefFor(
  product: PublicStoreProduct,
  storeName: string,
  whatsapp: string | null,
): string | null {
  const isService = product.kind === "service";
  return buildWhatsappLink(
    whatsapp,
    isService
      ? `Hi ${storeName}! I'm interested in your "${product.name}" service. I found you on Velte.`
      : `Hi ${storeName}! Is "${product.name}" still available? I found you on Velte.`,
  );
}

/** Image "post" — shared between the card and its detail modal so the two
 * never drift. */
function OfferingMedia({
  product,
  aspectClassName,
}: {
  product: PublicStoreProduct;
  aspectClassName: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full bg-gray-50 flex items-center justify-center overflow-hidden",
        aspectClassName,
      )}
    >
      {product.mainImageUrl ? (
        <img
          src={optimizedImageUrl(product.mainImageUrl)}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <StoreIcon size={30} className="text-gray-300" />
      )}
    </div>
  );
}

/** The full-detail view a card's "See more" opens into — everything the
 * card itself doesn't have room for: the untruncated description AND the
 * vendor's own service-detail attributes (the card never shows these at
 * all, see OfferingCard's own comment). */
function OfferingDetailModal({
  product,
  storeName,
  whatsapp,
  vendorId,
  isOwn,
  open,
  onClose,
}: {
  product: PublicStoreProduct;
  storeName: string;
  whatsapp: string | null;
  vendorId: string;
  isOwn: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const isService = product.kind === "service";
  const KindIcon = isService ? Wrench : Package;
  const enquireHref = enquireHrefFor(product, storeName, whatsapp);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <OfferingMedia product={product} aspectClassName="aspect-[4/3]" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <X size={16} />
          </button>
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
            <KindIcon size={11} />
            {isService ? "Service" : "Product"}
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <p className="text-base font-bold text-gray-800 leading-snug">
            {product.name}
          </p>
          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}
          {product.attributes.length > 0 && (
            <dl className="space-y-1.5 pt-2 border-t border-gray-100">
              {product.attributes.map((attr) => (
                <div
                  key={attr.name}
                  className="flex items-baseline gap-1.5 text-sm"
                >
                  <dt className="text-gray-400 shrink-0">{attr.name}:</dt>
                  <dd className="text-gray-700">{attr.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="pt-2 border-t border-gray-100">
            <Price product={product} />
          </div>
          {isOwn ? (
            <OwnListingBadge label="This is your listing" />
          ) : (
            enquireHref && (
              <WhatsAppButton
                href={enquireHref}
                label={isService ? "Enquire about this service" : "Enquire"}
                className="w-full"
                onClick={() => reportLead(vendorId, product.id)}
              />
            )
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Social-post-style card: a big image "post" up top, caption (name, price,
// description) below, then an action row — the same shape for a product or
// a service, differing only in the kind label/icon and the WhatsApp copy.
// Price/Enquire always sit at the card's own bottom edge (`mt-auto` inside
// a flex column that fills the grid row's full stretched height), so a
// grid row of cards with uneven name/description lengths still lines up
// its CTAs across the row instead of each card's button floating wherever
// its own content happens to end.
export function OfferingCard({
  product,
  storeName,
  whatsapp,
  vendorId,
  isOwn,
}: PublicStoreProductProps) {
  const isService = product.kind === "service";
  const KindIcon = isService ? Wrench : Package;
  const [detailOpen, setDetailOpen] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  const enquireHref = enquireHrefFor(product, storeName, whatsapp);

  // Same overflow-detection technique as ExpandableText (search results) —
  // only offer "See more" when the description actually got clipped by its
  // own 2-line clamp, never as a pointless toggle on a short description.
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setDescOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [product.description]);

  // Service-detail attributes never render on the card itself (no room
  // alongside price/CTA) — their mere existence alone is reason enough to
  // offer "See more", even when the description itself is short/absent.
  const hasMore = descOverflows || product.attributes.length > 0;

  return (
    <div className="bg-white border rounded-2xl border-gray-100 shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md flex flex-col h-full">
      <div className="relative">
        <OfferingMedia product={product} aspectClassName="aspect-[4/3]" />
        <span className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
          <KindIcon size={11} />
          {isService ? "Service" : "Product"}
        </span>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-w-0">
          {product.name}
        </p>
        {product.description && (
          <p
            ref={descRef}
            className="text-[13px] text-gray-500 leading-relaxed line-clamp-2"
          >
            {product.description}
          </p>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDetailOpen(true);
            }}
            className="self-start text-[12px] font-semibold text-orange-600 hover:text-orange-700"
          >
            See more
          </button>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2.5 mt-auto border-t border-gray-100">
          <Price product={product} />
          {!isOwn && enquireHref && (
            <a
              href={enquireHref}
              rel="noreferrer"
              onClick={() => reportLead(vendorId, product.id)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-[12px] sm:text-[13px] font-semibold rounded-lg transition-colors w-full sm:w-auto shrink-0"
            >
              <MessageCircle size={13} />
              Enquire
            </a>
          )}
        </div>
      </div>

      <OfferingDetailModal
        product={product}
        storeName={storeName}
        whatsapp={whatsapp}
        vendorId={vendorId}
        isOwn={isOwn}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
