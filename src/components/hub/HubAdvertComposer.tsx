"use client";

import { useState } from "react";
import { toast } from "sonner";

import { LockIcon } from "@/components/icons";
import { HubLockedModal } from "./HubLockedModal";
import { api, ApiError } from "@/lib/api-client";
import { uploadProductMedia, validateImageFile } from "@/lib/cloudinary";
import { formatNaira } from "@/lib/utils";
import { categoriesApi } from "@/services/products";
import type { CategoryProduct } from "@/types/product";
import type { HubContext } from "@/types/hub";
import { cn } from "@/lib/utils";

type PosterSource = "upload" | "listing" | "template";

// Poster source picker + advert composer. Three poster paths per
// vendor-delivery-and-hub.md: own artwork (upload), a listing photo, or a
// Velte template. Templates don't exist yet — that tab is an honest
// coming-soon panel, not a dead button.
export function HubAdvertComposer({
  context,
  walletHref,
  storeName,
  onPlaced,
  initialBoosted = false,
}: {
  context: HubContext;
  walletHref: string;
  /** The vendor's store name — grounds AI drafts, never drafted from nothing. */
  storeName: string;
  onPlaced: () => void;
  /** Also draft the linked broadcast. Boost is a separate sheet. */
  initialBoosted?: boolean;
}) {
  const [source, setSource] = useState<PosterSource>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [blurb, setBlurb] = useState("");
  const [boosted, setBoosted] = useState(initialBoosted);
  const [uploading, setUploading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [needTopup, setNeedTopup] = useState(false);
  const [listings, setListings] = useState<CategoryProduct[] | null>(null);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [templateLocked, setTemplateLocked] = useState(false);
  const [aiOptions, setAiOptions] = useState<{
    headlines: string[];
    blurb: string;
  } | null>(null);

  const atCap = context.activeAdverts >= context.maxActiveAdverts;
  const price = context.enterprise
    ? "Free with Enterprise"
    : formatNaira(context.advertCostKobo);
  const canPlace = !atCap && !placing && imageUrl && headline.trim().length > 0;

  const pickUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProductMedia(file);
      setImageUrl(url);
      setProductId(null);
      setProductName(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openListings = async () => {
    setSource("listing");
    if (listings !== null || listingsLoading) return;
    setListingsLoading(true);
    try {
      const result = await categoriesApi.getProducts({ limit: 50 });
      setListings(
        result.products.filter((p) => !p.isSuspended && p.mainImageUrl),
      );
    } catch {
      toast.error("Couldn't load your listings.");
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  };

  const draftWithAi = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const copy = await api.post<{
        headlines: string[];
        blurb: string;
      }>("/api/hub/draft-copy", {
        storeName,
        productName,
        seedHeadline: headline.trim() || null,
      });
      setAiOptions(copy);
    } catch {
      toast.error("Couldn't draft copy — write it yourself, still works.");
    } finally {
      setAiLoading(false);
    }
  };

  const place = async () => {
    if (!canPlace) return;
    setPlacing(true);
    setNeedTopup(false);
    try {
      await api.post("/api/hub/adverts", {
        imageUrl,
        headline: headline.trim().slice(0, 80),
        blurb: blurb.trim().slice(0, 280),
        templateId: null,
        productId,
        boosted,
      });
      toast.success(
        boosted ? "Advert pinned + broadcast drafted." : "Advert pinned.",
      );
      setHeadline("");
      setBlurb("");
      setImageUrl(null);
      setProductId(null);
      setProductName(null);
      setBoosted(false);
      setAiOptions(null);
      onPlaced();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        // Vendor-initiated spend fails CLOSED (unlike buyer leads): no
        // balance, no pin — with the wallet one tap away.
        setNeedTopup(true);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Couldn't place this advert.",
        );
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
      {templateLocked && (
        <HubLockedModal
          variant="upgrade"
          title="Extra templates are on Enterprise"
          body="Upload your own artwork or use a listing photo. Additional poster templates are on Enterprise."
          ctaLabel="Upgrade to Enterprise"
          ctaHref="/pricing"
          onClose={() => setTemplateLocked(false)}
        />
      )}
      <h3 className="font-bold text-ink">New advert</h3>
      <p className="text-xs text-gray-500 mt-1">
        Pinned to the top of the Hub for {context.advertDays} days · {price}
      </p>

      {/* Poster source */}
      <div className="inline-flex p-1 bg-gray-100 rounded-xl mt-4">
        {(
          [
            { key: "upload", label: "Upload art" },
            { key: "listing", label: "Listing photo" },
            { key: "template", label: "Template" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              if (tab.key === "template" && !context.enterprise) {
                setTemplateLocked(true);
                return;
              }
              if (tab.key === "listing") void openListings();
              else setSource(tab.key);
            }}
            className={cn(
              "inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
              source === tab.key
                ? "bg-surface text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {tab.key === "template" && !context.enterprise && (
              <LockIcon size={11} className="mr-1" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {source === "upload" && (
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => void pickUpload(e.target.files)}
            />
            <span className="text-sm font-semibold text-gray-700">
              {uploading
                ? "Uploading…"
                : imageUrl
                  ? "Replace artwork"
                  : "Upload your poster"}
            </span>
            <span className="text-xs text-gray-400">
              Your own design, or one an IT specialist made for you
            </span>
          </label>
        )}

        {source === "listing" && (
          <div>
            {listingsLoading ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                Loading your listings…
              </p>
            ) : listings?.length ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {listings.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setImageUrl(p.mainImageUrl ?? null);
                      setProductId(p.id);
                      setProductName(p.name);
                    }}
                    className={cn(
                      "relative rounded-xl overflow-hidden border-2 transition-colors aspect-square bg-gray-50",
                      productId === p.id
                        ? "border-orange-500"
                        : "border-transparent hover:border-gray-300",
                    )}
                    title={p.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.mainImageUrl ?? ""}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">
                No listings with photos yet — add one first, or upload art.
              </p>
            )}
          </div>
        )}

        {source === "template" && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-gray-700">
              Poster templates are on the way
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Upload artwork or use a listing photo for now — Enterprise gets
              extra templates when they land.
            </p>
          </div>
        )}
      </div>

      {/* Preview + copy */}
      {imageUrl && (
        <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Advert poster preview"
            className="w-full aspect-[16/9] object-cover bg-gray-50"
          />
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500">
            Stuck on words? AI drafts from your store and listing — you pick and
            edit.
          </p>
          <button
            type="button"
            onClick={() => void draftWithAi()}
            disabled={aiLoading}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors shrink-0 disabled:opacity-40"
          >
            {aiLoading ? "Drafting…" : "Draft with AI"}
          </button>
        </div>
        {aiOptions && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 space-y-1.5">
            {aiOptions.headlines.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHeadline(h)}
                className="block w-full text-left text-[13px] font-semibold text-ink hover:text-orange-600 transition-colors"
              >
                {h}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBlurb(aiOptions.blurb)}
              className="block w-full text-left text-xs text-gray-500 hover:text-orange-600 transition-colors pt-1 border-t border-orange-200/60"
            >
              {aiOptions.blurb}
            </button>
          </div>
        )}
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={80}
          placeholder="Headline — e.g. Weekend sales on all sneakers"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
        />
        <textarea
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Blurb (optional) — what should buyers know?"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none"
        />
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={boosted}
            onChange={(e) => setBoosted(e.target.checked)}
            className="mt-0.5 accent-orange-500"
          />
          <span className="text-xs text-gray-600 leading-relaxed">
            Also draft a broadcast for this advert — a push to buyers who opted
            in. Charged {formatNaira(context.broadcastCostKobo)} when sent.
          </span>
        </label>
      </div>

      {needTopup && (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex flex-wrap items-center gap-3">
          <p className="text-xs text-gray-700 flex-1 min-w-40">
            Wallet balance ({formatNaira(context.walletBalanceKobo)})
            doesn&apos;t cover this pin ({formatNaira(context.advertCostKobo)}).
          </p>
          <a
            href={walletHref}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors"
          >
            Top up wallet
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => void place()}
        disabled={!canPlace}
        className="mt-4 w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {placing
          ? "Placing…"
          : atCap
            ? `Pin limit reached (${context.maxActiveAdverts} live)`
            : context.enterprise
              ? "Pin advert — free"
              : `Pin advert — ${formatNaira(context.advertCostKobo)}`}
      </button>
    </div>
  );
}
