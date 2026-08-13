"use client";

import { useState } from "react";
import { Heart, ShieldCheck } from "lucide-react";

import { useSavedItems } from "@/hooks/useSavedItems";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import { SaveButton } from "@/components/buyer/SaveButton";
import { MarketplaceBrowse } from "@/components/marketplace/MarketplaceBrowse";
import { VendorsGrid } from "@/components/marketplace/VendorsGrid";
import { BuyerEmptyState } from "@/components/buyer/BuyerEmptyState";
import { cn } from "@/lib/utils";

type Tab = "products" | "vendors";

function tabClass(isActive: boolean) {
  return cn(
    "px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
    isActive
      ? "bg-white text-orange-600 shadow-sm"
      : "text-gray-500 hover:text-gray-700",
  );
}

/* §5 of the buyer-redesign brief: "make this a P0 feature, not a later
   cosmetic feature" — replaces the old "coming soon" placeholder with the
   real thing, on top of BuyerSavedItem (velte-backend) + useSavedItems.
   Reuses MarketplaceBrowse/VendorsGrid as-is (same cards Discover/Home
   render), just with each card's saveSlot wired to a live SaveButton so a
   tap here unsaves in place — a buyer managing their saved list shouldn't
   need to go find the item again elsewhere to remove it. */
export default function BuyerSavedPage() {
  const { buyer } = useBuyerSession();
  const { products, vendors, isLoading } = useSavedItems();
  const { navigate } = useBuyerNavigation();
  const [active, setActive] = useState<Tab>("products");

  if (!buyer) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-16">
        <BuyerEmptyState
          icon={ShieldCheck}
          title="Verify to see what you've saved"
          subtitle="Verify your number to save products and follow vendors."
          action={
            <button
              onClick={() => navigate("/buyer/auth?redirect=/buyer/saved")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Verify your number
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-6 space-y-5">
      <div>
        <h1 className="text-dash-title font-bold text-gray-900 mb-1">Saved</h1>
        <p className="text-dash-body text-gray-400">
          Products you&apos;ve saved and vendors you follow.
        </p>
      </div>

      <div className="inline-flex p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setActive("products")}
          className={tabClass(active === "products")}
        >
          Products{products.length > 0 && ` (${products.length})`}
        </button>
        <button
          type="button"
          onClick={() => setActive("vendors")}
          className={tabClass(active === "vendors")}
        >
          Vendors{vendors.length > 0 && ` (${vendors.length})`}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse"
            />
          ))}
        </div>
      ) : active === "products" ? (
        products.length === 0 ? (
          <BuyerEmptyState
            icon={Heart}
            iconClass="bg-pink-50 text-pink-400"
            title="No saved products yet"
            subtitle="Tap the heart on any listing to save it here."
          />
        ) : (
          <MarketplaceBrowse
            items={products}
            renderSaveSlot={(item) => (
              <SaveButton kind="product" targetId={item.id} />
            )}
          />
        )
      ) : vendors.length === 0 ? (
        <BuyerEmptyState
          icon={Heart}
          iconClass="bg-pink-50 text-pink-400"
          title="Not following any vendors yet"
          subtitle="Tap the heart on a vendor's card to follow them here."
        />
      ) : (
        <VendorsGrid
          vendors={vendors}
          renderSaveSlot={(vendor) => (
            <SaveButton kind="vendor" targetId={vendor.vendorId} />
          )}
        />
      )}
    </div>
  );
}
