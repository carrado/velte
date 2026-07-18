"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { reportLead } from "@/lib/reportLead";
import type { PublicStoreTab, StoreTabsProps } from "@/types/store";
import { OfferingCard } from "./shared";
import { WhatsAppButton } from "@/components/WhatsAppButton";

// Compact segmented control (Products / Services) plus a two-column body
// (persistent Intro sidebar + the active panel). Only ever two tabs now —
// About was dropped, the Intro sidebar already covers that ground — so this
// is a plain non-scrolling pill switcher, not the old scrollable tab strip.
export default function StoreTabs({
  goods,
  services,
  isFood,
  storeName,
  whatsapp,
  vendorId,
  defaultTab,
  sidebar,
}: StoreTabsProps) {
  const [active, setActive] = useState<PublicStoreTab>(defaultTab);
  const goodsLabel = isFood ? "Menu" : "Products";
  const isEmpty = goods.length === 0 && services.length === 0;

  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Hi ${storeName}! I found your store on Velte.`,
      )}`
    : null;

  if (isEmpty) {
    return (
      <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-24 space-y-4">{sidebar}</div>
        </aside>
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
                onClick={() => reportLead(vendorId)}
              />
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-gray-800">
                {storeName} is still setting up their catalog
              </p>
              <p className="text-sm text-gray-500 mt-1.5">Check back soon.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const tabs = (
    [
      goods.length > 0 && { key: "products" as const, label: goodsLabel },
      services.length > 0 && { key: "services" as const, label: "Services" },
    ] as const
  ).filter(Boolean) as { key: PublicStoreTab; label: string }[];

  return (
    <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-8">
      <aside className="hidden lg:block">
        <div className="lg:sticky lg:top-24 space-y-4">{sidebar}</div>
      </aside>

      <div className="min-w-0">
        {tabs.length > 0 && (
          <div className="inline-flex p-1 mb-5 bg-gray-100 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={cn(
                  "px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
                  active === tab.key
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {active === "products" && goods.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {goods.map((product) => (
              <OfferingCard
                key={product.id}
                product={product}
                storeName={storeName}
                whatsapp={whatsapp}
                vendorId={vendorId}
              />
            ))}
          </div>
        )}

        {active === "services" && services.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {services.map((product) => (
              <OfferingCard
                key={product.id}
                product={product}
                storeName={storeName}
                whatsapp={whatsapp}
                vendorId={vendorId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
