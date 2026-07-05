"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Loader2, Camera, X, Compass, Send } from "lucide-react";
import { toast } from "sonner";
import { runSearchStream } from "@/lib/searchStream";
import { uploadProductMedia, validateImageFile } from "@/lib/cloudinary";
import { VendorResultCard } from "@/components/search/VendorResultCard";
import { StoreResultCard } from "@/components/search/StoreResultCard";
import { ExternalBusinessCard } from "@/components/search/ExternalBusinessCard";
import type {
  BuyerLocation,
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  StoreMatch,
  VendorMatch,
} from "@/types/search";

type Phase = "idle" | "loading" | "done";

// Velte's buyer-facing search (build-order step d/e), at /search —
// `/` is now the marketing homepage. One big
// input, a status line that morphs in place while searching (the
// "dynamism" spec calls for — not a spinner), then vendor result cards. A
// photo can stand in for text entirely — spec calls image upload "a
// headline feature," not an accessory to typing.
export function SearchHome() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [reply, setReply] = useState("");
  const [products, setProducts] = useState<VendorMatch[]>([]);
  const [stores, setStores] = useState<StoreMatch[]>([]);
  const [productsMatchTier, setProductsMatchTier] = useState<MatchTier>(null);
  const [storesMatchTier, setStoresMatchTier] = useState<MatchTier>(null);
  const [productsMatchQuality, setProductsMatchQuality] =
    useState<MatchQuality>(undefined);
  const [externalStoreSuggestions, setExternalStoreSuggestions] = useState<
    NearbyBusiness[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A memoized promise, not a one-shot effect + ref: the buyer should
  // always search around their real location unless they name a different
  // one — a fast submit racing an unresolved getCurrentPosition() call used
  // to silently drop it. Kicked off eagerly on mount (usually already
  // settled by the time someone finishes typing) and awaited in
  // handleSubmit as a safety net so it's never lost to the race, only
  // capped by the same 8s timeout as before.
  const buyerLocationPromise = useRef<Promise<BuyerLocation | null> | null>(
    null,
  );
  function getBuyerLocationOnce(): Promise<BuyerLocation | null> {
    if (!buyerLocationPromise.current) {
      buyerLocationPromise.current = new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          () => resolve(null),
          { timeout: 8000 },
        );
      });
    }
    return buyerLocationPromise.current;
  }

  useEffect(() => {
    getBuyerLocationOnce();
  }, []);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setImagePreview(URL.createObjectURL(file));
    setImageUrl(null);
    setUploadingImage(true);
    try {
      const url = await uploadProductMedia(
        file,
        "image",
        "velte/search-queries",
      );
      setImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  }

  function clearImage() {
    setImagePreview(null);
    setImageUrl(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = query.trim();
    if ((!message && !imageUrl) || phase === "loading" || uploadingImage)
      return;

    setPhase("loading");
    setStatus(
      imageUrl ? "Looking at your photo…" : "Understanding your request…",
    );
    setReply("");
    setProducts([]);
    setStores([]);
    setProductsMatchTier(null);
    setStoresMatchTier(null);
    setProductsMatchQuality(undefined);
    setExternalStoreSuggestions([]);
    setError(null);

    const location = await getBuyerLocationOnce();

    await runSearchStream(
      {
        message,
        imageUrl: imageUrl ?? undefined,
        buyerLocation: location ?? undefined,
      },
      {
        onStatus: setStatus,
        onFinal: (event) => {
          setReply(event.reply);
          setProducts(event.products);
          setStores(event.stores);
          setProductsMatchTier(event.productsMatchTier);
          setStoresMatchTier(event.storesMatchTier);
          setProductsMatchQuality(event.productsMatchQuality);
          setExternalStoreSuggestions(event.externalStoreSuggestions);
          setPhase("done");
        },
        onError: (message) => {
          setError(message);
          setPhase("done");
        },
      },
    );
  }

  const collapsed = phase !== "idle";

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-8 py-4">
        <Image
          src="/velte_logo_esn5dj.png"
          alt="Velte"
          width={120}
          height={18}
        />
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/auth/login"
            className="text-gray-600 hover:text-gray-900"
          >
            Log in
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            List your business
          </Link>
        </div>
      </header>

      <main
        className={
          collapsed
            ? "flex-1 px-5 sm:px-8 pb-16"
            : "flex-1 flex flex-col items-center justify-center px-5"
        }
      >
        {!collapsed && (
          <div className="text-center mb-8 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#023337] mb-2">
              What are you looking for?
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              Describe it, tell us where you are, and we&apos;ll find the
              nearest vendor who actually has it.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={collapsed ? "max-w-4xl mx-auto pt-4" : "w-full max-w-2xl"}
        >
          {imagePreview && (
            <div className="flex items-center gap-2 mb-2 pl-1">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Search photo"
                  className="w-full h-full object-cover"
                />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearImage}
                className="text-gray-400 hover:text-gray-600"
                title="Remove photo"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-white rounded-2xl border border-gray-200 shadow-sm pl-4 pr-2 h-14 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'Tecno fast charger near me'"
              className="flex-1 min-w-0 h-full outline-none text-[15px] bg-transparent"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              title="Search with a photo"
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <Camera size={18} />
            </button>
            <button
              type="submit"
              disabled={
                (!query.trim() && !imageUrl) ||
                phase === "loading" ||
                uploadingImage
              }
              title="Send"
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white transition-colors"
            >
              <Send size={17} />
            </button>
          </div>
        </form>

        {collapsed && (
          <div className="max-w-4xl mx-auto mt-6">
            {phase === "loading" && (
              <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
                <Loader2 size={15} className="animate-spin" />
                <span>{status}</span>
              </div>
            )}

            {phase === "done" && error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {phase === "done" && !error && (
              <div className="space-y-6">
                {products.length > 0 || stores.length > 0 ? (
                  <>
                    <p className="text-[15px] text-gray-700 leading-relaxed">
                      {reply}
                    </p>
                    {products.length > 0 && (
                      <div className="space-y-3">
                        {(stores.length > 0 ||
                          productsMatchTier === "state" ||
                          productsMatchQuality) && (
                          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            {productsMatchQuality === "direct"
                              ? "Exact match"
                              : productsMatchTier === "state"
                                ? productsMatchQuality === "similar"
                                  ? "Similar options — elsewhere in your state"
                                  : "Products — elsewhere in your state"
                                : productsMatchQuality === "similar"
                                  ? "Similar options nearby"
                                  : "Products"}
                          </h2>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {products.map((match) => (
                            <VendorResultCard
                              key={match.productId}
                              match={match}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {stores.length > 0 && (
                      <div className="space-y-3">
                        {(products.length > 0 ||
                          storesMatchTier === "state") && (
                          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            {storesMatchTier === "state"
                              ? "Vendors — elsewhere in your state"
                              : "Vendors near you"}
                          </h2>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {stores.map((match) => (
                            <StoreResultCard
                              key={match.storeId}
                              match={match}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : externalStoreSuggestions.length > 0 ? (
                  // No Velte vendor matched — real nearby businesses via
                  // Google Places (searchStores Tier 3), visibly distinct
                  // from an actual Velte listing (see ExternalBusinessCard).
                  <>
                    <p className="text-[15px] text-gray-700 leading-relaxed">
                      {reply}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {externalStoreSuggestions.map((match) => (
                        <ExternalBusinessCard
                          key={match.name + match.address}
                          match={match}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  // No listed vendor has this yet — an AI suggestion card
                  // (spec §3.5), not a bare empty state.
                  <div className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <Compass
                      size={20}
                      className="text-orange-500 shrink-0 mt-0.5"
                    />
                    <p className="text-[15px] text-gray-700 leading-relaxed">
                      {reply}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
