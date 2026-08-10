import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Package, Wrench } from "lucide-react";
import { getPublicStore, getSimilarVendors } from "@/lib/server/store";
import { BackendError } from "@/lib/server/backend";
import { getOptionalUserId } from "@/lib/server/guards";
import { buildWhatsappLink, normalizeWhatsappNumber } from "@/lib/whatsapp";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import type {
  IntroCardProps,
  PublicStore,
  PublicStoreTab,
} from "@/types/store";
import StoreNavbar from "./_components/StoreNavbar";
import StoreHero from "./_components/StoreHero";
import StoreFooter from "./_components/StoreFooter";
import StoreTabs from "./_components/StoreTabs";
import SimilarVendors from "./_components/SimilarVendors";
import { StoreWhatsAppButton } from "./_components/shared";

// Public storefront — server-rendered for SEO and link previews. This is the
// page the AI hands buyers off to. A real site shell (Navbar with a "Find on
// Velte" link +
// sign-in/vendor-aware account slot, a rich hero carrying the store's own
// photos or a sector-themed generated background, the catalog body, and a
// vendor-profile footer) rather than a bare listing page. Styling follows the
// app palette: #F1F5F9 background, white cards, orange accents — #023337 is
// text-only, never a surface.

async function fetchStore(handle: string): Promise<PublicStore | null> {
  try {
    return await getPublicStore(handle);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const store = await fetchStore(handle);
  if (!store) return { title: "Store not found · Velte" };
  const description =
    store.description ||
    `${store.name} on Velte — chat with this vendor directly.`;
  const image = store.gallery[0] ?? store.avatar ?? undefined;
  return {
    title: `${store.name} · Velte`,
    description,
    alternates: {
      canonical: `/store/${store.handle}`,
    },
    openGraph: {
      title: store.name,
      description,
      url: `/store/${store.handle}`,
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      title: store.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** LocalBusiness structured data — every field comes straight off the same
 * store record the page renders, never invented (no fabricated street
 * address/geo — PublicStore only ever carries a free-text `area`). */
function storeJsonLd(store: PublicStore) {
  const telephone = store.whatsapp
    ? `+${normalizeWhatsappNumber(store.whatsapp)}`
    : undefined;
  const image = store.gallery[0] ?? store.avatar ?? undefined;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    description: store.description || undefined,
    url: `https://velte.ng/store/${store.handle}`,
    ...(image ? { image } : {}),
    ...(telephone ? { telephone } : {}),
    ...(store.area
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: store.area,
            addressCountry: "NG",
          },
        }
      : {}),
  };
}

function IntroCard({
  store,
  goodsCount,
  servicesCount,
  whatsappHref,
  isOwn,
}: IntroCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-bold text-[#023337] uppercase tracking-wide">
        Intro
      </h3>
      {store.description && (
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-6">
          {store.description}
        </p>
      )}
      <ul className="space-y-2.5">
        {store.area && (
          <li className="flex items-center gap-2.5 text-sm text-gray-600">
            <MapPin size={15} className="text-orange-500 flex-shrink-0" />
            {store.area}
          </li>
        )}
        {goodsCount > 0 && (
          <li className="flex items-center gap-2.5 text-sm text-gray-600">
            <Package size={15} className="text-orange-500 flex-shrink-0" />
            {goodsCount} {goodsCount === 1 ? "product" : "products"} listed
          </li>
        )}
        {servicesCount > 0 && (
          <li className="flex items-center gap-2.5 text-sm text-gray-600">
            <Wrench size={15} className="text-orange-500 flex-shrink-0" />
            {servicesCount} {servicesCount === 1 ? "service" : "services"}{" "}
            offered
          </li>
        )}
      </ul>
      {store.sectors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {store.sectors.map((sector) => (
            <span
              key={sector}
              className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full"
            >
              {sector}
            </span>
          ))}
        </div>
      )}
      {isOwn ? (
        <OwnListingBadge label="This is your store" />
      ) : (
        whatsappHref && (
          <StoreWhatsAppButton
            href={whatsappHref}
            label="Chat on WhatsApp"
            className="w-full"
            vendorId={store.vendorId}
          />
        )
      )}
    </div>
  );
}

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const store = await fetchStore(handle);
  if (!store) notFound();

  // Best-effort — a backend hiccup here shouldn't take the whole storefront
  // down, just quietly drop the "Other vendors" section (see SimilarVendors'
  // own empty-state).
  const similarVendors = await getSimilarVendors(handle).catch(() => []);

  const currentUserId = await getOptionalUserId();
  const isOwn = currentUserId != null && currentUserId === store.vendorId;

  const whatsappHref = buildWhatsappLink(
    store.whatsapp,
    `Hi ${store.name}! I found your store on Velte.`,
  );

  const goods = store.products.filter((p) => p.kind === "product");
  const services = store.products.filter((p) => p.kind === "service");
  // Lead with whichever offering the store actually deals in.
  const servicesFirst =
    services.length > 0 &&
    (goods.length === 0 || services.length >= goods.length);

  const defaultTab: PublicStoreTab =
    servicesFirst || (services.length > 0 && goods.length === 0)
      ? "services"
      : "products";

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd(store)) }}
      />
      <StoreNavbar />

      <StoreHero
        handle={store.handle}
        name={store.name}
        avatar={store.avatar}
        gallery={store.gallery}
        area={store.area}
        sectors={store.sectors}
        goodsCount={goods.length}
        servicesCount={services.length}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* ── Tabs + content ─────────────────────────────────────────────── */}
        <StoreTabs
          goods={goods}
          services={services}
          storeName={store.name}
          whatsapp={store.whatsapp}
          vendorId={store.vendorId}
          defaultTab={defaultTab}
          isOwn={isOwn}
          sidebar={
            <IntroCard
              store={store}
              goodsCount={goods.length}
              servicesCount={services.length}
              whatsappHref={whatsappHref}
              isOwn={isOwn}
            />
          }
        />
      </div>

      <SimilarVendors vendors={similarVendors} />

      <StoreFooter
        name={store.name}
        handle={store.handle}
        area={store.area}
        sectors={store.sectors}
      />

      {/* ── Mobile sticky chat bar ─────────────────────────────────────── */}
      {!isOwn && whatsappHref && (
        <div className="fixed bottom-0 inset-x-0 sm:hidden z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <StoreWhatsAppButton
            href={whatsappHref}
            label={`Chat with ${store.name}`}
            className="w-full"
            vendorId={store.vendorId}
          />
        </div>
      )}
    </div>
  );
}
