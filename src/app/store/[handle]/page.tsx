/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  MapPin,
  MessageCircle,
  Store as StoreIcon,
  Package,
  Wrench,
} from "lucide-react";
import { getPublicStore } from "@/lib/server/store";
import { BackendError } from "@/lib/server/backend";
import type {
  IntroCardProps,
  PublicStore,
  PublicStoreTab,
} from "@/types/store";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import StoreTabs from "./_components/StoreTabs";

// Public storefront — server-rendered for SEO and link previews. This is the
// page the AI hands buyers off to. Modelled on a Facebook profile: full-bleed
// cover, circular avatar overlapping it, then a sticky tab bar (Products /
// Services / Photos / About) with a persistent Intro sidebar on desktop.
// Styling follows the app palette: #F1F5F9 background, white cards, orange
// accents — #023337 is text-only, never a surface.

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
        <WhatsAppButton
          href={whatsappHref}
          label="Chat on WhatsApp"
          className="w-full"
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

  const isFood = store.businessType === "food";
  const goods = store.products.filter((p) => p.kind === "product");
  const services = store.products.filter((p) => p.kind === "service");
  // Lead with whichever offering the store actually deals in.
  const servicesFirst =
    services.length > 0 &&
    (goods.length === 0 || services.length >= goods.length);

  // The first gallery photo doubles as the cover; the rest go in the mosaic.
  const cover = store.gallery[0] ?? null;
  const photos = store.gallery.slice(1);

  const defaultTab: PublicStoreTab = servicesFirst
    ? "services"
    : goods.length > 0
      ? "products"
      : services.length > 0
        ? "services"
        : photos.length > 0
          ? "photos"
          : "about";

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src="/velte_logo_esn5dj.png"
              alt="Velte"
              className="h-10 sm:h-14 w-auto"
            />
          </Link>
          <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold">
            Storefront
          </span>
        </div>
      </header>

      {/* ── Cover ──────────────────────────────────────────────────────── */}
      <div className="relative h-44 sm:h-72 lg:h-80 w-full overflow-hidden bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50">
        {cover ? (
          <img
            src={cover}
            alt={`${store.name} cover`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <StoreIcon
            size={96}
            strokeWidth={1.25}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-orange-200"
          />
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* ── Profile header (Facebook-style avatar overlap) ────────────── */}
        <div className="relative -mt-12 sm:-mt-16 pb-5 border-b border-gray-200">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0">
              <div className="w-full h-full rounded-full bg-orange-500 ring-[6px] ring-[#F1F5F9] shadow-lg flex items-center justify-center text-white text-4xl sm:text-5xl font-bold overflow-hidden">
                {store.avatar ? (
                  <img
                    src={store.avatar}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  store.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute bottom-1 right-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white ring-[3px] ring-[#F1F5F9] shadow flex items-center justify-center">
                <StoreIcon size={14} className="text-orange-500" />
              </div>
            </div>

            {whatsappHref && (
              <div className="hidden sm:block pb-2">
                <WhatsAppButton href={whatsappHref} label="Chat on WhatsApp" />
              </div>
            )}
          </div>

          <div className="mt-3 sm:mt-4">
            <h1 className="text-2xl sm:text-3xl font-black text-[#023337] leading-tight">
              {store.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm">
              <span className="text-gray-400">@{store.handle}</span>
              {store.area && (
                <span className="flex items-center gap-1 text-gray-500">
                  <MapPin size={14} className="text-orange-500" />
                  {store.area}
                </span>
              )}
            </div>
            {store.description && (
              <p className="text-sm text-gray-600 mt-2 max-w-xl leading-relaxed line-clamp-2">
                {store.description}
              </p>
            )}
            {(goods.length > 0 || services.length > 0) && (
              <p className="text-sm text-gray-400 mt-2">
                {[
                  goods.length > 0 &&
                    `${goods.length} ${
                      goods.length === 1
                        ? isFood
                          ? "dish"
                          : "product"
                        : isFood
                          ? "dishes"
                          : "products"
                    }`,
                  services.length > 0 &&
                    `${services.length} ${
                      services.length === 1 ? "service" : "services"
                    }`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>

          {whatsappHref && (
            <div className="sm:hidden mt-4">
              <WhatsAppButton
                href={whatsappHref}
                label="Chat on WhatsApp"
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* ── Tabs + content ─────────────────────────────────────────────── */}
        <StoreTabs
          goods={goods}
          services={services}
          photos={photos}
          isFood={isFood}
          storeName={store.name}
          whatsapp={store.whatsapp}
          description={store.description}
          area={store.area}
          sectors={store.sectors}
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

        {/* ── Closing CTA ────────────────────────────────────────────────── */}
        {(goods.length > 0 || services.length > 0) && whatsappHref && (
          <section className="bg-orange-50 border border-orange-100 rounded-2xl p-6 sm:p-8 mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-white items-center justify-center flex-shrink-0">
                  <MessageCircle size={20} className="text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-[#023337]">
                    Don&apos;t see what you need?
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {servicesFirst
                      ? `Describe the job to ${store.name} and get a quote in chat.`
                      : `Ask ${store.name} directly — prices are negotiable in chat.`}
                  </p>
                </div>
              </div>
              <WhatsAppButton href={whatsappHref} label="Start a chat" />
            </div>
          </section>
        )}

        <p className="text-center text-xs text-gray-400 py-8">
          Powered by{" "}
          <Link
            href="/"
            className="font-semibold text-orange-500 hover:underline"
          >
            Velte
          </Link>{" "}
          — where buyers find nearby vendors
        </p>
      </div>

      {/* ── Mobile sticky chat bar ─────────────────────────────────────── */}
      {whatsappHref && (
        <div className="fixed bottom-0 inset-x-0 sm:hidden z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <WhatsAppButton
            href={whatsappHref}
            label={`Chat with ${store.name}`}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
