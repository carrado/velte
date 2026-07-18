import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Package, Wrench } from "lucide-react";
import { getPublicStore } from "@/lib/server/store";
import { BackendError } from "@/lib/server/backend";
import { isFoodBusiness } from "@/hooks/useBusinessType";
import type {
  IntroCardProps,
  PublicStore,
  PublicStoreTab,
} from "@/types/store";
import StoreNavbar from "./_components/StoreNavbar";
import StoreHero from "./_components/StoreHero";
import StoreFooter from "./_components/StoreFooter";
import StoreTabs from "./_components/StoreTabs";
import { StoreWhatsAppButton } from "./_components/shared";

// Public storefront — server-rendered for SEO and link previews. This is the
// page the AI hands buyers off to. A real site shell (Navbar with AI Search +
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
  return {
    title: `${store.name} · Velte`,
    description:
      store.description ||
      `${store.name} on Velte — chat with this vendor directly.`,
    openGraph: {
      title: store.name,
      description: store.description || undefined,
      images: store.gallery[0] ?? store.avatar ?? undefined,
    },
  };
}

function IntroCard({
  store,
  goodsCount,
  servicesCount,
  isFood,
  whatsappHref,
}: IntroCardProps) {
  const goodsUnit = isFood ? "dish" : "product";
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
            {goodsCount} {goodsCount === 1 ? goodsUnit : `${goodsUnit}s`} listed
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
      {whatsappHref && (
        <StoreWhatsAppButton
          href={whatsappHref}
          label="Chat on WhatsApp"
          className="w-full"
          vendorId={store.vendorId}
        />
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

  const whatsappHref = store.whatsapp
    ? `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(
        `Hi ${store.name}! I found your store on Velte.`,
      )}`
    : null;

  // Was `=== "food"` — silently missed food_both stores.
  const isFood = isFoodBusiness(store.businessType);
  const goodsUnit = isFood ? "dish" : "product";
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
        goodsUnit={goodsUnit}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* ── Tabs + content ─────────────────────────────────────────────── */}
        <StoreTabs
          goods={goods}
          services={services}
          isFood={isFood}
          storeName={store.name}
          whatsapp={store.whatsapp}
          vendorId={store.vendorId}
          defaultTab={defaultTab}
          sidebar={
            <IntroCard
              store={store}
              goodsCount={goods.length}
              servicesCount={services.length}
              isFood={isFood}
              whatsappHref={whatsappHref}
            />
          }
        />
      </div>

      <StoreFooter
        name={store.name}
        handle={store.handle}
        area={store.area}
        sectors={store.sectors}
      />

      {/* ── Mobile sticky chat bar ─────────────────────────────────────── */}
      {whatsappHref && (
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
