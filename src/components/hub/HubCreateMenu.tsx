"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CloseIcon } from "@/components/icons/hero";
import { modalScrimClass } from "@/lib/modalScrim";
import { cn } from "@/lib/utils";
import type { HubContext, HubVendorAdvert } from "@/types/hub";
import { HubAdvertComposer } from "./HubAdvertComposer";
import { HubBroadcastComposer } from "./HubBroadcastComposer";

// The vendor's way into everything the Hub can publish: the prompt card sits
// atop their timeline ("Share something…"), opening a modal with the advert
// and broadcast composers plus the two editors that feed the Hub for free
// (a listing upload, the contact card). Pricing appears only on the action
// buttons inside the composers — never as a banner here.
export function HubCreateMenu({
  context,
  walletHref,
  storeName,
  adverts,
  onPlaced,
}: {
  context: HubContext;
  walletHref: string;
  storeName: string;
  adverts: HubVendorAdvert[];
  onPlaced: () => void;
}) {
  const pathname = usePathname();
  const userId = pathname.split("/")[1] ?? "";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"advert" | "broadcast">("advert");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mb-4 bg-surface rounded-2xl border border-gray-200 shadow-sm px-4 py-3.5 text-left hover:border-orange-300 transition-colors"
      >
        <span className="text-sm text-gray-400">
          Share something with the Hub…
        </span>
        <span className="flex gap-2 mt-2.5">
          {(["Advert", "Broadcast"] as const).map((label) => (
            <span
              key={label}
              className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full"
            >
              {label}
            </span>
          ))}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create for the Hub"
          className={`fixed inset-0 z-50 h-dvh w-dvw flex items-end sm:items-center justify-center ${modalScrimClass()}`}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-canvas w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex p-1 bg-gray-100 rounded-xl">
                {(
                  [
                    { key: "advert", label: "Place advert" },
                    { key: "broadcast", label: "Broadcast" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
                      tab === t.key
                        ? "bg-surface text-orange-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {tab === "advert" ? (
              <HubAdvertComposer
                context={context}
                walletHref={walletHref}
                storeName={storeName}
                onPlaced={() => {
                  onPlaced();
                  setOpen(false);
                }}
              />
            ) : (
              <HubBroadcastComposer
                context={context}
                adverts={adverts}
                onSaved={() => {
                  onPlaced();
                  setOpen(false);
                }}
              />
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <Link
                href={`/${userId}/products/add`}
                className="text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors"
              >
                Add a listing instead →
              </Link>
              <Link
                href={`/${userId}/store`}
                className="text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors"
              >
                Edit contact card →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
