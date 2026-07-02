/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, MessageCircle, Store as StoreIcon } from "lucide-react";
import { getPublicStore } from "@/lib/server/store";
import { BackendError } from "@/lib/server/backend";
import { fmt } from "@/lib/product-price";
import type { PublicStore } from "@/types/store";

// Public storefront — server-rendered for SEO and link previews. This is the
// page the AI hands buyers off to.

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

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* Store header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden flex-shrink-0">
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
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-[#023337]">{store.name}</h1>
              <p className="text-dash-secondary text-gray-400">
                @{store.handle}
              </p>
              {store.area && (
                <p className="flex items-center gap-1 text-dash-secondary text-gray-500 mt-1">
                  <MapPin size={13} className="text-orange-500" />
                  {store.area}
                </p>
              )}
            </div>
          </div>

          {store.description && (
            <p className="text-dash-body text-gray-600 mt-4 whitespace-pre-line">
              {store.description}
            </p>
          )}

          {store.sectors.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {store.sectors.map((sector) => (
                <span
                  key={sector}
                  className="px-3 py-1 bg-orange-50 text-orange-700 text-dash-caption font-medium rounded-full"
                >
                  {sector}
                </span>
              ))}
            </div>
          )}

          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-dash-body font-semibold rounded-xl transition-colors"
            >
              <MessageCircle size={16} />
              Chat on WhatsApp
            </a>
          )}
        </div>

        {/* Gallery */}
        {store.gallery.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-dash-heading font-semibold text-gray-900 mb-4">
              Showcase
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {store.gallery.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt={`${store.name} showcase`}
                  className="w-full aspect-square object-cover rounded-xl border border-gray-100"
                />
              ))}
            </div>
          </div>
        )}

        {/* No catalog yet — keep the page inviting rather than empty: the
            chat handoff IS this store's storefront until they list things. */}
        {store.products.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-dash-body font-semibold text-gray-800">
              Looking for something specific?
            </p>
            <p className="text-dash-secondary text-gray-500 mt-1 max-w-sm mx-auto">
              {store.whatsapp
                ? `Ask ${store.name} directly — they respond on WhatsApp.`
                : `${store.name} is still setting up their catalog — check back soon.`}
            </p>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-dash-body font-semibold rounded-xl transition-colors"
              >
                <MessageCircle size={16} />
                Ask on WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Catalog */}
        {store.products.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-dash-heading font-semibold text-gray-900 mb-4">
              {store.businessType === "food" ? "Menu" : "What we offer"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {store.products.map((product) => (
                <div key={product.id} className="min-w-0">
                  <div className="relative w-full aspect-square bg-gray-50 rounded-xl border border-gray-100 overflow-hidden mb-2 flex items-center justify-center">
                    {product.mainImageUrl ? (
                      <img
                        src={product.mainImageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <StoreIcon size={22} className="text-gray-300" />
                    )}
                    {product.kind === "service" && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 text-[#023337] text-dash-caption font-semibold rounded-full border border-gray-100">
                        Service
                      </span>
                    )}
                  </div>
                  <p className="text-dash-body font-medium text-gray-800 truncate">
                    {product.name}
                  </p>
                  <p className="text-dash-secondary font-semibold text-[#023337]">
                    {product.priceFrom && (
                      <span className="font-normal text-gray-400">from </span>
                    )}
                    {fmt(
                      (product.discountedPrice ?? product.price) / 100,
                      product.currency === "USD" ? "$" : "₦",
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-dash-caption text-gray-400 pb-4">
          Powered by{" "}
          <span className="font-semibold text-orange-500">Velte</span>
        </p>
      </div>
    </div>
  );
}
