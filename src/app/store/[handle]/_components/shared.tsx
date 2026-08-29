"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/product-price";
import { ProtectedImage } from "@/components/ProtectedImage";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { resolveGalleryImages } from "@/lib/media";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ListingDetailModal } from "@/components/ListingDetailModal";
import { ImageLightbox } from "@/components/ImageLightbox";
import { buildChatLink } from "@/lib/chatLink";
import type {
  PublicStoreProduct,
  PublicStoreProductProps,
} from "@/types/store";
import {
  ImagesIcon,
  MessageCircleIcon,
  PackageIcon,
  StoreIcon,
  WrenchIcon,
} from "@/components/icons";

// "use client" so the server page (page.tsx) can still import/render these
// across the server/client boundary while StoreWhatsAppButton attaches a
// real onClick — a Server Component can't pass an inline event handler to
// a prop itself, but it CAN render an already-client component that owns
// its own handler internally, which is exactly what this is for.

/** Was a WhatsAppButton plus a lead-billing beacon; the beacon is gone
 * (2026-08-27 — billing moved server-side into /api/chat, which the href now
 * points at), leaving nothing but the button. Kept as a named re-export
 * rather than deleted so the store page's own call sites keep reading as
 * "the store's chat button", and so there's one obvious place to add
 * store-specific behaviour back if it's ever wanted. */
export function StoreWhatsAppButton({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return <WhatsAppButton href={href} label={label} className={className} />;
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
  vendorId: string,
): string | null {
  const isService = product.kind === "service";
  return buildChatLink({
    vendorId,
    productId: product.mainImageUrl ? product.id : undefined,
    source: "browse",
    message: isService
      ? `Hi ${storeName}! I'm interested in your "${product.name}" service. I found you on Velte.`
      : `Hi ${storeName}! Is "${product.name}" still available? I found you on Velte.`,
  });
}

/** Image "post" for the compact card — just the main image, no carousel
 * controls (no room for them at this size). The full [main, ...thumbnails]
 * set only ever renders as a swipeable gallery inside ListingDetailModal. */
function OfferingMedia({
  product,
  aspectClassName,
}: {
  product: PublicStoreProduct;
  aspectClassName: string;
}) {
  const mainImage = product.mainImageUrl;
  return (
    <div
      className={`relative w-full bg-gray-50 flex items-center justify-center overflow-hidden ${aspectClassName}`}
    >
      {mainImage ? (
        <ProtectedImage
          src={optimizedImageUrl(mainImage)}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <StoreIcon size={30} className="text-gray-300" />
      )}
    </div>
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
  vendorId,
  isOwn,
}: PublicStoreProductProps) {
  const isService = product.kind === "service";
  const KindIcon = isService ? WrenchIcon : PackageIcon;
  const [detailOpen, setDetailOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  const enquireHref = enquireHrefFor(product, storeName, vendorId);
  const images = resolveGalleryImages(
    product.mainImageUrl,
    product.thumbnailUrls,
  );

  // Same overflow-detection technique as ExpandableText (search results) —
  // only offer "See more" when the description actually got clipped by its
  // own 2-line clamp, never as a pointless toggle on a short description.
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setDescOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [product.description]);

  // Service-detail attributes never render on the card itself (no room
  // alongside price/CTA), and extra photos beyond the main one aren't
  // reachable from the card's own (single-image) media area — either alone
  // is reason enough to offer "See more", even when the description itself
  // is short/absent.
  const hasMore =
    descOverflows || product.attributes.length > 0 || images.length > 1;

  return (
    <div className="bg-white border rounded-2xl border-gray-100 shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md flex flex-col h-full">
      <div
        className={
          product.mainImageUrl ? "relative cursor-zoom-in" : "relative"
        }
        onClick={() => product.mainImageUrl && setLightboxOpen(true)}
      >
        <OfferingMedia product={product} aspectClassName="aspect-[4/3]" />
        <span className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
          <KindIcon size={11} />
          {isService ? "Service" : "Product"}
        </span>
        {images.length > 1 && (
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
            <ImagesIcon size={11} />
            {images.length}
          </span>
        )}
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
            className="self-start text-[12px] font-semibold text-orange-600 hover:text-orange-700 underline"
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
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-[12px] sm:text-[13px] font-semibold rounded-lg transition-colors w-full sm:w-auto shrink-0"
            >
              <MessageCircleIcon size={13} />
              Enquire
            </a>
          )}
        </div>
      </div>

      <ListingDetailModal
        item={{
          name: product.name,
          kind: product.kind,
          quoteOnRequest: product.quoteOnRequest ?? false,
          price: product.price,
          priceMax: product.priceMax ?? null,
          currency: product.currency,
          images,
          description: product.description,
          attributes: product.attributes,
        }}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        isOwn={isOwn}
        chatHref={enquireHref}
        chatLabel={isService ? "Enquire about this service" : "Enquire"}
      />

      <ImageLightbox
        images={images}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={product.name}
      />
    </div>
  );
}
