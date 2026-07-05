"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { MessageCircle, MapPin, Package, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicStoreTab, StoreTabsProps } from "@/types/store";
import type { TabItem } from "@/types/common";
import { ProductCard, ServiceCard } from "./shared";
import { WhatsAppButton } from "@/components/WhatsAppButton";

// Facebook-profile-style tab switcher: a sticky underline tab bar plus a
// two-column body (persistent Intro sidebar + the active panel). Panels are
// swapped client-side, but since this is still server-rendered on first
// load, none of the catalog content is lost to crawlers.

export default function StoreTabs({
  goods,
  services,
  photos,
  isFood,
  storeName,
  whatsapp,
  description,
  area,
  sectors,
  defaultTab,
  sidebar,
}: StoreTabsProps) {
  const [active, setActive] = useState<PublicStoreTab>(defaultTab);
  const goodsLabel = isFood ? "Menu" : "Products";
  const goodsUnit = isFood ? "dish" : "product";
  const isEmpty = goods.length === 0 && services.length === 0;

  const tabs = (
    [
      goods.length > 0 && {
        key: "products",
        label: goodsLabel,
        count: goods.length,
      },
      services.length > 0 && {
        key: "services",
        label: "Services",
        count: services.length,
      },
      photos.length > 0 && {
        key: "photos",
        label: "Photos",
        count: photos.length,
      },
      { key: "about", label: "About" },
    ] as const
  ).filter(Boolean) as TabItem<PublicStoreTab>[];

  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Hi ${storeName}! I found your store on Velte.`,
      )}`
    : null;

  return (
    <div>
      {/* Tab bar */}
      <div className="sticky top-16 sm:top-20 z-20 bg-[#F1F5F9]/95 backdrop-blur-sm border-b border-gray-200 -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                "relative flex-shrink-0 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer",
                active === tab.key
                  ? "text-orange-600"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-gray-400 font-normal">
                  {tab.count}
                </span>
              )}
              {active === tab.key && (
                <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-orange-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-8 mt-6">
        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-32 space-y-4">{sidebar}</div>
        </aside>

        <div className="min-w-0">
          {active === "products" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {goods.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {active === "services" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((product) => (
                <ServiceCard
                  key={product.id}
                  product={product}
                  storeName={storeName}
                  whatsapp={whatsapp}
                />
              ))}
            </div>
          )}

          {active === "photos" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {photos.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={`${storeName} photo`}
                  className={cn(
                    "w-full aspect-square object-cover rounded-2xl",
                    i === 0 && photos.length > 2 && "col-span-2 row-span-2",
                  )}
                />
              ))}
            </div>
          )}

          {active === "about" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <h3 className="text-base font-bold text-[#023337]">
                  About {storeName}
                </h3>
                {description ? (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No description yet.
                  </p>
                )}
                <ul className="space-y-2.5 pt-3 border-t border-gray-100">
                  {area && (
                    <li className="flex items-center gap-2.5 text-sm text-gray-600">
                      <MapPin
                        size={15}
                        className="text-orange-500 flex-shrink-0"
                      />
                      {area}
                    </li>
                  )}
                  {goods.length > 0 && (
                    <li className="flex items-center gap-2.5 text-sm text-gray-600">
                      <Package
                        size={15}
                        className="text-orange-500 flex-shrink-0"
                      />
                      {goods.length}{" "}
                      {goods.length === 1 ? goodsUnit : `${goodsUnit}s`} listed
                    </li>
                  )}
                  {services.length > 0 && (
                    <li className="flex items-center gap-2.5 text-sm text-gray-600">
                      <Wrench
                        size={15}
                        className="text-orange-500 flex-shrink-0"
                      />
                      {services.length}{" "}
                      {services.length === 1 ? "service" : "services"} offered
                    </li>
                  )}
                </ul>
                {sectors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sectors.map((sector) => (
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
                    className="w-full sm:w-auto"
                  />
                )}
              </div>

              {isEmpty && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10 text-center">
                  {whatsappHref ? (
                    <>
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                        <MessageCircle size={22} className="text-orange-500" />
                      </div>
                      <p className="text-base font-semibold text-gray-800">
                        Looking for something specific?
                      </p>
                      <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                        Ask {storeName} directly — they respond on WhatsApp.
                      </p>
                      <WhatsAppButton
                        href={whatsappHref}
                        label="Ask on WhatsApp"
                        className="mt-5"
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-base font-semibold text-gray-800">
                        {storeName} is still setting up their catalog
                      </p>
                      <p className="text-sm text-gray-500 mt-1.5">
                        Check back soon.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
