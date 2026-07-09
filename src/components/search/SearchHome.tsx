"use client";

/* eslint-disable @next/next/no-img-element */

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
import { StoreProductCard } from "@/components/search/StoreProductCard";
import { useUserStore } from "@/store/userStore";
import { usersApi } from "@/services/users";
import { getInitial } from "@/lib/initials";
import type {
  BuyerLocation,
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  SearchHistoryTurn,
  StoreMatch,
  StoreProductItem,
  VendorMatch,
} from "@/types/search";

function productsHeading(
  matchTier: MatchTier,
  matchQuality: MatchQuality,
): string {
  if (matchQuality === "direct") return "Exact match";
  if (matchTier === "nationwide") {
    return matchQuality === "similar"
      ? "Similar options — across Velte"
      : "Across Velte";
  }
  if (matchTier === "state") {
    return matchQuality === "similar"
      ? "Similar options — elsewhere in your state"
      : "Products — elsewhere in your state";
  }
  if (matchTier === "nearby") {
    return matchQuality === "similar"
      ? "Similar options — a bit further out"
      : "A bit further out";
  }
  return matchQuality === "similar" ? "Similar options nearby" : "Products";
}

function storesHeading(matchTier: MatchTier): string {
  if (matchTier === "nationwide") return "Vendors across Velte";
  if (matchTier === "state") return "Vendors — elsewhere in your state";
  if (matchTier === "nearby") return "Vendors — a bit further out";
  return "Vendors near you";
}

// Renders the AI's reply text as lightweight markdown — bold and lists only
// (the system prompt keeps replies to a short note, occasionally a short
// list, never headers/tables/links/code) — rather than a full markdown
// library, since raw "**bold**"/"- item" syntax showing up as literal
// asterisks and dashes was exactly the "unnecessary special characters"
// complaint this fixes.
function renderInlineBold(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong
        key={`${keyPrefix}-${i}`}
        className="font-semibold text-[#023337]"
      >
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

// Three distinct literal discriminants, not "ul" | "ol" grouped into one
// member — a shared discriminant value doesn't narrow cleanly through
// sequential `if (block.type === ...)` checks below.
type ReplyBlock =
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; lines: string[] };

function FormattedReply({ text }: { text: string }) {
  const blocks: ReplyBlock[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const bulletMatch = /^[-*•]\s+(.*)$/.exec(line);
    const numberedMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];

    if (bulletMatch) {
      if (last?.type === "ul") last.items.push(bulletMatch[1]);
      else blocks.push({ type: "ul", items: [bulletMatch[1]] });
    } else if (numberedMatch) {
      if (last?.type === "ol") last.items.push(numberedMatch[1]);
      else blocks.push({ type: "ol", items: [numberedMatch[1]] });
    } else if (last?.type === "p") {
      last.lines.push(line);
    } else {
      blocks.push({ type: "p", lines: [line] });
    }
  }

  return (
    <div className="text-[15px] text-gray-700 leading-relaxed space-y-2">
      {blocks.map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{renderInlineBold(item, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{renderInlineBold(item, `${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInlineBold(line, `${i}-${j}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// One exchange in the conversation: the buyer's message (+ optional photo
// preview) and everything the search produced for it. Lives only in this
// component's React state — never localStorage, never a database. A page
// refresh loses the whole conversation by design (see SearchHistoryTurn).
interface ConversationTurn {
  id: string;
  query: string;
  imagePreview: string | null;
  phase: "loading" | "done";
  status: string;
  reply: string;
  // False when the model asked a clarifying question instead of searching
  // (see systemPrompt.ts) — renders as a plain reply, not the "nothing
  // found anywhere" suggestion card, since the conversation is still open.
  toolCalled: boolean;
  products: VendorMatch[];
  stores: StoreMatch[];
  // The businessType actually searched for this turn (e.g. "tailor") — null
  // when searchStores wasn't called. Passed to StoreResultCard only for a
  // pure vendor/store result (turn.products empty), so its WhatsApp message
  // reflects what the buyer was actually looking for.
  storesQuery: string | null;
  // The storefront of each matched product's own vendor (see route.ts) — one
  // per unique vendor already in `products`, so a matched item also surfaces
  // who actually sells it, not just the WhatsApp contact already on its card.
  productStores: StoreMatch[];
  productsMatchTier: MatchTier;
  storesMatchTier: MatchTier;
  productsMatchQuality: MatchQuality;
  externalStoreSuggestions: NearbyBusiness[];
  vendorProducts: StoreProductItem[];
  vendorProductsStore: {
    name: string;
    handle: string;
    whatsapp: string | null;
    vendorId: string;
  } | null;
  // A machine-only breadcrumb (e.g. store handles just found) appended to
  // this turn's text in `history` so a LATER turn's model call can resolve
  // "what do they sell" back to a specific store — never rendered to the
  // buyer, and never anything beyond what's already visible on the cards.
  contextNote: string | null;
  error: string | null;
}

function ConversationTurnView({ turn }: { turn: ConversationTurn }) {
  return (
    <div className="space-y-3">
      {/* The buyer's own message — right-aligned, shaded with the app's
          accent color, like a chat bubble. The AI's response below is
          left/full-width instead, since it's cards and prose, not a bubble. */}
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[70%] bg-orange-100 rounded-2xl rounded-br-md px-4 py-2.5 flex items-start gap-2.5">
          {turn.imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={turn.imagePreview}
              alt="Search photo"
              className="w-14 h-14 rounded-lg object-cover shrink-0 border border-orange-200"
            />
          )}
          {turn.query && (
            <p className="text-[15px] text-[#023337] leading-relaxed">
              {turn.query}
            </p>
          )}
        </div>
      </div>

      {turn.phase === "loading" && (
        <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
          <Loader2 size={15} className="animate-spin" />
          <span>{turn.status}</span>
        </div>
      )}

      {turn.phase === "done" && turn.error && (
        <p className="text-sm text-red-600">{turn.error}</p>
      )}

      {turn.phase === "done" && !turn.error && (
        <div className="space-y-6">
          {turn.products.length > 0 ||
          turn.stores.length > 0 ||
          turn.vendorProducts.length > 0 ? (
            <>
              <FormattedReply text={turn.reply} />
              {turn.vendorProducts.length > 0 && turn.vendorProductsStore && (
                <div className="space-y-3">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    From {turn.vendorProductsStore.name}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {turn.vendorProducts.map((item) => (
                      <StoreProductCard
                        key={item.productId}
                        match={item}
                        storeName={turn.vendorProductsStore!.name}
                        storeWhatsapp={turn.vendorProductsStore!.whatsapp}
                        vendorId={turn.vendorProductsStore!.vendorId}
                      />
                    ))}
                  </div>
                </div>
              )}
              {turn.products.length > 0 && (
                <div className="space-y-3">
                  {(turn.stores.length > 0 ||
                    (turn.productsMatchTier &&
                      turn.productsMatchTier !== "local") ||
                    turn.productsMatchQuality) && (
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {productsHeading(
                        turn.productsMatchTier,
                        turn.productsMatchQuality,
                      )}
                    </h2>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {turn.products.map((match) => (
                      <VendorResultCard key={match.productId} match={match} />
                    ))}
                  </div>
                </div>
              )}
              {turn.productStores.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {turn.productStores.length === 1
                      ? "Sold by"
                      : "Sold by these vendors"}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {turn.productStores.map((match) => (
                      <StoreResultCard key={match.storeId} match={match} />
                    ))}
                  </div>
                </div>
              )}
              {turn.stores.length > 0 && (
                <div className="space-y-3">
                  {(turn.products.length > 0 ||
                    (turn.storesMatchTier &&
                      turn.storesMatchTier !== "local")) && (
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {storesHeading(turn.storesMatchTier)}
                    </h2>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {turn.stores.map((match) => (
                      <StoreResultCard
                        key={match.storeId}
                        match={match}
                        // Only when this is a pure vendor/store result (no
                        // product attached) — a dual-intent turn already has
                        // a product for the buyer to reference instead.
                        searchQuery={
                          turn.products.length === 0 ? turn.storesQuery : null
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : turn.externalStoreSuggestions.length > 0 ? (
            // No Velte vendor matched — real nearby businesses via Google
            // Places (searchStores Tier 5), visibly distinct from an actual
            // Velte listing (see ExternalBusinessCard).
            <>
              <FormattedReply text={turn.reply} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {turn.externalStoreSuggestions.map((match) => (
                  <ExternalBusinessCard
                    key={match.name + match.address}
                    match={match}
                  />
                ))}
              </div>
            </>
          ) : !turn.toolCalled ? (
            // The model asked a clarifying question instead of searching
            // (see systemPrompt.ts) — a plain reply, same as the text above
            // a result grid, never the "nothing found anywhere" card below:
            // the conversation is still open, not a dead end.
            <FormattedReply text={turn.reply} />
          ) : (
            // A real search ran and came up completely empty — an AI
            // suggestion card (spec §3.5), not a bare empty state.
            <div className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <Compass size={20} className="text-orange-500 shrink-0 mt-0.5" />
              <FormattedReply text={turn.reply} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Velte's buyer-facing search (build-order step d/e), at /search —
// `/` is now the marketing homepage. Structured as a conversation: each
// submission appends a turn (ConversationTurn) rather than replacing the
// last one, and a short text-only history is sent back to the model so
// follow-ups ("cheaper", "in red instead") have context. Nothing here is
// persisted — `turns` is plain component state, never written to
// localStorage or a database, so refreshing the page starts a new
// conversation from scratch, by design.
export function SearchHome() {
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const isSending = turns.some((t) => t.phase === "loading");
  const userDetails = useUserStore((state) => state.user);

  // This page is public (no buyer account) — a vendor can land here too, and
  // must never be silently bounced to /auth/login just for loading it (see
  // getMeSilent's own note), so this checks quietly rather than via getMe.
  useEffect(() => {
    if (!useUserStore.getState().user) {
      usersApi.getMeSilent();
    }
  }, []);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scrolls the new message into view only when a turn is actually ADDED
  // (submit), not on every subsequent status/final update within that same
  // turn — found live that re-scrolling on every streamed update yanked the
  // view down again right as the final reply/cards rendered, when the
  // buyer may have already been reading from the top of the response.
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevTurnCountRef = useRef(0);
  useEffect(() => {
    if (turns.length > prevTurnCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    prevTurnCountRef.current = turns.length;
  }, [turns.length]);

  // A memoized promise, not a one-shot effect + ref: the buyer should
  // always search around their real location unless they name a different
  // one — a fast submit racing an unresolved getCurrentPosition() call used
  // to silently drop it. Kicked off eagerly on mount (usually already
  // settled by the time someone finishes typing) and awaited in
  // handleSubmit as a safety net so it's never lost to the race, only
  // capped by the same 8s timeout as before.
  //
  // Only a successful resolution is cached permanently (buyerLocationRef) —
  // a denied/timed-out attempt clears buyerLocationPromise so the next call
  // retries instead of being stuck on a stale null for the rest of the
  // session (e.g. the buyer initially dismissed the prompt, then granted
  // permission from the browser's address-bar icon).
  const buyerLocationRef = useRef<BuyerLocation | null>(null);
  const buyerLocationPromise = useRef<Promise<BuyerLocation | null> | null>(
    null,
  );
  function getBuyerLocationOnce(): Promise<BuyerLocation | null> {
    if (buyerLocationRef.current) {
      return Promise.resolve(buyerLocationRef.current);
    }
    if (!buyerLocationPromise.current) {
      buyerLocationPromise.current = new Promise<BuyerLocation | null>(
        (resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const loc = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              buyerLocationRef.current = loc;
              resolve(loc);
            },
            (err) => {
              // Swallowed to null either way (search still runs nationwide
              // rather than blocking on location), but the specific reason
              // matters for debugging "why did this go nationwide" — code 1
              // is a real permission denial, 2 is the OS/browser reporting
              // no location fix at all (e.g. Windows' own Location Services
              // toggle is off, independent of the browser's own permission
              // being granted), 3 is just the 8s timeout expiring.
              console.warn(
                `[search] geolocation failed (code ${err.code}): ${err.message}`,
              );
              resolve(null);
            },
            { timeout: 8000 },
          );
        },
      ).finally(() => {
        buyerLocationPromise.current = null;
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

  function updateTurn(id: string, patch: Partial<ConversationTurn>) {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = query.trim();
    if ((!message && !imageUrl) || isSending || uploadingImage) return;

    const turnId = crypto.randomUUID();
    const currentImageUrl = imageUrl;

    // Text-only history from prior completed turns (see SearchHistoryTurn) —
    // built before the new turn is appended, so it doesn't include itself.
    // A failed turn contributes nothing worth replaying to the model.
    // contextNote (store handles this turn surfaced) rides along on the
    // assistant's own message, not the buyer's — it's the model's own
    // breadcrumb, never something the buyer said or saw.
    const history: SearchHistoryTurn[] = turns
      .filter((t) => t.phase === "done" && !t.error)
      .flatMap((t) => [
        { role: "user" as const, content: t.query || "[sent a photo]" },
        {
          role: "assistant" as const,
          content: t.contextNote ? `${t.reply}\n${t.contextNote}` : t.reply,
        },
      ]);

    setTurns((prev) => [
      ...prev,
      {
        id: turnId,
        query: message,
        imagePreview,
        phase: "loading",
        status: currentImageUrl
          ? "Looking at your photo…"
          : "Understanding your request…",
        reply: "",
        toolCalled: false,
        products: [],
        stores: [],
        storesQuery: null,
        productStores: [],
        productsMatchTier: null,
        storesMatchTier: null,
        productsMatchQuality: undefined,
        externalStoreSuggestions: [],
        vendorProducts: [],
        vendorProductsStore: null,
        contextNote: null,
        error: null,
      },
    ]);
    setQuery("");
    setImagePreview(null);
    setImageUrl(null);

    const location = await getBuyerLocationOnce();

    await runSearchStream(
      {
        message,
        imageUrl: currentImageUrl ?? undefined,
        buyerLocation: location ?? undefined,
        history,
      },
      {
        onStatus: (text) => updateTurn(turnId, { status: text }),
        onFinal: (event) => {
          // A dual-intent query (e.g. "a phone repair shop that also sells
          // chargers") can call both tools and return the same vendor in
          // both lists — drop it from stores since its product card
          // already names the vendor, rather than showing it twice with no
          // link between the two cards.
          const productVendorIds = new Set(
            event.products.map((p) => p.vendorId),
          );
          const dedupedStores = event.stores.filter(
            (s) => !productVendorIds.has(s.vendorId),
          );
          // A machine-only breadcrumb for a LATER turn's history — lets the
          // model resolve a future "what do they sell" back to this exact
          // store via getVendorProducts, without needing the buyer-facing
          // reply text to ever name the vendor (it deliberately doesn't).
          // Includes productStores too (guaranteed disjoint from
          // dedupedStores by vendor) — a store surfaced only via its
          // matched product's own card should still resolve the same way.
          const allStoresFound = [...dedupedStores, ...event.productStores];
          const contextNote = allStoresFound.length
            ? `[Stores found: ${allStoresFound
                .map((s) => `"${s.name}" (handle: ${s.handle})`)
                .join(", ")}]`
            : null;
          updateTurn(turnId, {
            phase: "done",
            reply: event.reply,
            toolCalled: event.toolCalled,
            products: event.products,
            stores: dedupedStores,
            storesQuery: event.storesQuery,
            productStores: event.productStores,
            productsMatchTier: event.productsMatchTier,
            storesMatchTier: event.storesMatchTier,
            productsMatchQuality: event.productsMatchQuality,
            externalStoreSuggestions: event.externalStoreSuggestions,
            vendorProducts: event.vendorProducts,
            vendorProductsStore: event.vendorProductsStore,
            contextNote,
          });
        },
        onError: (errorMessage) => {
          updateTurn(turnId, { phase: "done", error: errorMessage });
        },
      },
    );
  }

  const collapsed = turns.length > 0;

  // One shared form, placed in different structural positions below —
  // centered on the idle hero screen, or pinned to the bottom of the
  // viewport once the conversation has started.
  const inputForm = (
    <form onSubmit={handleSubmit} className="w-full">
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
          placeholder={
            collapsed
              ? "Ask a follow-up, or search for something else…"
              : "e.g. 'Tecno fast charger near me'"
          }
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
          disabled={(!query.trim() && !imageUrl) || isSending || uploadingImage}
          title="Send"
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white transition-colors"
        >
          <Send size={17} />
        </button>
      </div>
    </form>
  );

  return (
    <div className="h-dvh bg-[#F1F5F9] flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 sm:px-8 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 sm:py-1 shrink-0 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm z-10">
        <Link href="/" className="shrink-0">
          <Image
            src="/velte_logo_esn5dj.png"
            alt="Velte"
            width={120}
            height={18}
            className="w-20 sm:w-[110px] h-auto"
            priority
          />
        </Link>
        {userDetails ? (
          // A vendor who wandered in from their own dashboard — send them
          // back to it (their wallet, specifically) rather than showing a
          // CTA to sign up for an account they already have.
          <Link
            href={`/${userDetails.id}/wallet`}
            className="flex items-center gap-2 min-w-0 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
              {userDetails.avatar ? (
                <img
                  src={userDetails.avatar}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  {getInitial(userDetails.company?.name ?? userDetails.name)}
                </span>
              )}
            </div>
            <span className="max-w-[100px] sm:max-w-[160px] truncate text-xs sm:text-sm font-medium text-gray-800">
              {userDetails.company?.name ?? userDetails.name}
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-4 text-sm font-medium shrink-0">
            <Link
              href="/auth/login"
              className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-2 sm:px-1 sm:py-0"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="flex items-center h-8 sm:h-auto px-3 sm:px-4 sm:py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold sm:font-medium transition-colors whitespace-nowrap"
            >
              <span className="sm:hidden">List business</span>
              <span className="hidden sm:inline">List your business</span>
            </Link>
          </div>
        )}
      </header>

      {!collapsed ? (
        <main className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="text-center mb-8 max-w-4xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#023337] mb-2">
              What are you looking for?
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              Describe it, tell us where you are, and we&apos;ll find the
              nearest vendor who actually has it.
            </p>
          </div>
          <div className="w-full max-w-4xl">{inputForm}</div>
        </main>
      ) : (
        <>
          {/* Newest content stays pinned to the bottom (bottomRef) as the
              thread grows, so scrolling reads bottom-up like a chat. */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {turns.map((turn) => (
                <ConversationTurnView key={turn.id} turn={turn} />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="shrink-0 px-5 sm:px-8 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="max-w-4xl mx-auto">{inputForm}</div>
          </div>
        </>
      )}
    </div>
  );
}
