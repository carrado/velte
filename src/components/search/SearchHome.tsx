"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Camera, X, Compass, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { runSearchStream } from "@/lib/searchStream";
import { uploadProductMedia, validateImageFile } from "@/lib/cloudinary";
import { VendorResultCard } from "@/components/search/VendorResultCard";
import { StoreResultCard } from "@/components/search/StoreResultCard";
import { ExternalBusinessCard } from "@/components/search/ExternalBusinessCard";
import { StoreProductCard } from "@/components/search/StoreProductCard";
import { ClarificationPrompt } from "@/components/search/ClarificationPrompt";
import { LocationPermissionModal } from "@/components/search/LocationPermissionModal";
import { useUserStore } from "@/store/userStore";
import { usersApi } from "@/services/users";
import { getInitial } from "@/lib/initials";
import type {
  BuyerLocation,
  Clarification,
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  SearchHistoryTurn,
  StoreMatch,
  StoreProductItem,
  VendorMatch,
} from "@/types/search";

// `products` decides the noun: a pure service turn (e.g. "haircut near me")
// shouldn't be headed "Products", and a turn can genuinely mix both kinds
// (retrieval is embeddings-based across all listings regardless of kind), so
// this can't just be a static "product vs service" flag passed in from the
// call site.
function productsNoun(products: VendorMatch[]): string {
  const hasProduct = products.some((p) => p.kind !== "service");
  const hasService = products.some((p) => p.kind === "service");
  if (hasProduct && hasService) return "Results";
  return hasService ? "Services" : "Products";
}

function productsHeading(
  matchTier: MatchTier,
  matchQuality: MatchQuality,
  products: VendorMatch[],
): string {
  if (matchQuality === "direct") return "Exact match";
  const noun = productsNoun(products);
  if (matchTier === "nationwide") {
    return matchQuality === "similar"
      ? "Similar options — across Velte"
      : "Across Velte";
  }
  if (matchTier === "state") {
    return matchQuality === "similar"
      ? "Similar options — elsewhere in your state"
      : `${noun} — elsewhere in your state`;
  }
  if (matchTier === "nearby") {
    return matchQuality === "similar"
      ? "Similar options — a bit further out"
      : "A bit further out";
  }
  return matchQuality === "similar" ? "Similar options nearby" : noun;
}

// Clusters `products` by vendorId, preserving each product's original rank
// order and the order vendors first appear in (so the highest-ranked
// product's vendor group still leads) — a buyer asking for "sneakers" who
// gets 3 listings from the same vendor should see those 3 together with one
// "Sold by" card underneath, not scattered across the grid with a separate,
// disconnected vendor-card section at the bottom (the old layout). `store`
// is null for a group whose products are all service-kind (route.ts
// excludes those from productStores — see StoreProductItem's own comment).
function groupProductsByVendor(
  products: VendorMatch[],
  productStores: StoreMatch[],
): { vendorId: string; products: VendorMatch[]; store: StoreMatch | null }[] {
  const storeByVendorId = new Map(productStores.map((s) => [s.vendorId, s]));
  const groups: {
    vendorId: string;
    products: VendorMatch[];
    store: StoreMatch | null;
  }[] = [];
  const groupByVendorId = new Map<string, (typeof groups)[number]>();
  for (const product of products) {
    let group = groupByVendorId.get(product.vendorId);
    if (!group) {
      group = {
        vendorId: product.vendorId,
        products: [],
        store: storeByVendorId.get(product.vendorId) ?? null,
      };
      groupByVendorId.set(product.vendorId, group);
      groups.push(group);
    }
    group.products.push(product);
  }
  return groups;
}

function storesHeading(
  matchTier: MatchTier,
  matchQuality: MatchQuality,
): string {
  if (matchTier === "nationwide") {
    return matchQuality === "similar"
      ? "Similar vendors — across Velte"
      : "Vendors across Velte";
  }
  if (matchTier === "state") {
    return matchQuality === "similar"
      ? "Similar vendors — elsewhere in your state"
      : "Vendors — elsewhere in your state";
  }
  if (matchTier === "nearby") {
    return matchQuality === "similar"
      ? "Similar vendors — a bit further out"
      : "Vendors — a bit further out";
  }
  return matchQuality === "similar"
    ? "Similar vendors nearby"
    : "Vendors near you";
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
  // Non-null when the model called askClarifyingQuestion this turn — only
  // actionable (rendered as a live widget) while this is the LATEST turn;
  // see the `isLatest` prop on ConversationTurnView.
  clarification: Clarification | null;
  products: VendorMatch[];
  // Up to 2 "not that close" candidates from the same tier as `products` —
  // see WEAK_MATCH_LIMIT in retrieval.service.js and weakProducts' own
  // comment on SearchStreamEvent. Always empty when `products` is.
  weakProducts: VendorMatch[];
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
  storesMatchQuality: MatchQuality;
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

function ConversationTurnView({
  turn,
  isLatest,
  onAnswerClarification,
}: {
  turn: ConversationTurn;
  isLatest: boolean;
  onAnswerClarification: (text: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* The buyer's own message — right-aligned, shaded with the app's
          accent color, like a chat bubble. The AI's response below sits in
          its own row with an avatar, plain text/cards rather than a bubble —
          same structure as ChatGPT's thread. */}
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[70%] bg-orange-50 border border-orange-100 rounded-3xl rounded-br-lg px-4 py-2.5 flex items-start gap-2.5">
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

      <div className="flex items-start gap-3">
        <img
          src="/velte_manifest.png"
          alt="Velte"
          className="w-8 h-8 rounded-full object-cover shrink-0"
        />
        <div className="flex-1 min-w-0 pt-0.5">
          {turn.phase === "loading" && (
            <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse min-w-0">
              <Loader2 size={15} className="animate-spin shrink-0" />
              <span className="truncate min-w-0">{turn.status}</span>
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
                  {turn.vendorProducts.length > 0 &&
                    turn.vendorProductsStore && (
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
                    <div className="space-y-6">
                      {(turn.stores.length > 0 ||
                        (turn.productsMatchTier &&
                          turn.productsMatchTier !== "local") ||
                        turn.productsMatchQuality) && (
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {productsHeading(
                            turn.productsMatchTier,
                            turn.productsMatchQuality,
                            turn.products,
                          )}
                        </h2>
                      )}
                      {groupProductsByVendor(
                        turn.products,
                        turn.productStores,
                      ).map((group) => (
                        <div key={group.vendorId} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.products.map((match) => (
                              <VendorResultCard
                                key={match.productId}
                                match={match}
                              />
                            ))}
                          </div>
                          {group.store ? (
                            <div className="pl-3 border-l-2 border-orange-100 space-y-2">
                              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                                Sold by
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <StoreResultCard match={group.store} />
                              </div>
                            </div>
                          ) : (
                            // Service-only vendor group — no store card (see
                            // route.ts: a service listing's own card already
                            // shows the vendor's description/attributes/
                            // WhatsApp, so a companion store card would be
                            // redundant). Still anchor the group to its
                            // vendor visually when there's more than one
                            // listing, same purpose the "Sold by" label
                            // serves above.
                            group.products.length > 1 && (
                              <p className="pl-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                                {group.products.length} services from{" "}
                                {group.products[0].vendorName}
                              </p>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {turn.weakProducts.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        A couple more options — not an exact match
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {turn.weakProducts.map((match) => (
                          <VendorResultCard
                            key={match.productId}
                            match={match}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {turn.stores.length > 0 && (
                    <div className="space-y-3">
                      {(turn.products.length > 0 ||
                        (turn.storesMatchTier &&
                          turn.storesMatchTier !== "local") ||
                        turn.storesMatchQuality) && (
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {storesHeading(
                            turn.storesMatchTier,
                            turn.storesMatchQuality,
                          )}
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
                              turn.products.length === 0
                                ? turn.storesQuery
                                : null
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
                  <Compass
                    size={20}
                    className="text-orange-500 shrink-0 mt-0.5"
                  />
                  <FormattedReply text={turn.reply} />
                </div>
              )}
              {/* Sits after, not inside, the chain above — so the rare turn
              where the model both ran a real search AND asked a follow-up
              question still shows the results AND this widget, rather than
              one silently suppressing the other. Only actionable (rendered
              at all) while this is still the latest turn — once answered,
              a new turn is appended and this one's isLatest flips false. */}
              {turn.clarification && isLatest && (
                <ClarificationPrompt
                  clarification={turn.clarification}
                  onAnswer={onAnswerClarification}
                />
              )}
            </div>
          )}
        </div>
      </div>
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

  // Checked via the Permissions API rather than calling getBuyerLocationOnce
  // straight away — that would fire the browser's native geolocation prompt
  // the instant the page loads, with zero context for why. "granted"
  // fetches silently (no prompt, nothing to explain); "prompt" (undecided)
  // shows our own explanation first via LocationPermissionModal; "denied"
  // is left alone entirely — the browser won't re-prompt either way, and a
  // getCurrentPosition() call would just fail again. Safari's geolocation
  // support for this query has historically been inconsistent, so any
  // failure/lack of support falls back to showing the modal too, rather
  // than silently assuming permission either way.
  const [showLocationModal, setShowLocationModal] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function checkLocationPermission() {
      if (!navigator.geolocation) return;
      if (!navigator.permissions?.query) {
        if (!cancelled) setShowLocationModal(true);
        return;
      }
      try {
        const status = await navigator.permissions.query({
          name: "geolocation",
        });
        if (cancelled) return;
        if (status.state === "granted") getBuyerLocationOnce();
        else if (status.state === "prompt") setShowLocationModal(true);
      } catch {
        if (!cancelled) setShowLocationModal(true);
      }
    }
    checkLocationPermission();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAllowLocation = () => {
    setShowLocationModal(false);
    getBuyerLocationOnce();
  };

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

  // Shared by the main composer (handleSubmit) and a clarification answer
  // (handleClarificationAnswer, via ClarificationPrompt) — both are just "the
  // buyer sent a message," the only difference is where the text came from
  // and whether an image rides along. Callers are responsible for their own
  // send-guard (isSending/uploadingImage/hasPendingClarification) and for
  // clearing their own input state before calling this.
  async function submitMessage(
    message: string,
    currentImageUrl: string | null,
    currentImagePreview: string | null,
  ): Promise<void> {
    const turnId = crypto.randomUUID();

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
        imagePreview: currentImagePreview,
        phase: "loading",
        status: currentImageUrl
          ? "Looking at your photo…"
          : "Understanding your request…",
        reply: "",
        toolCalled: false,
        clarification: null,
        products: [],
        weakProducts: [],
        stores: [],
        storesQuery: null,
        productStores: [],
        productsMatchTier: null,
        storesMatchTier: null,
        productsMatchQuality: undefined,
        storesMatchQuality: undefined,
        externalStoreSuggestions: [],
        vendorProducts: [],
        vendorProductsStore: null,
        contextNote: null,
        error: null,
      },
    ]);

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
            clarification: event.clarification,
            products: event.products,
            weakProducts: event.weakProducts,
            stores: dedupedStores,
            storesQuery: event.storesQuery,
            productStores: event.productStores,
            productsMatchTier: event.productsMatchTier,
            storesMatchTier: event.storesMatchTier,
            productsMatchQuality: event.productsMatchQuality,
            storesMatchQuality: event.storesMatchQuality,
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

  // Shared by the form's onSubmit and the composer textarea's Enter-to-send
  // (see textareaRef below) — both are just "the buyer hit send," the only
  // difference is which DOM event triggered it.
  async function trySubmit() {
    const message = query.trim();
    if (
      (!message && !imageUrl) ||
      isSending ||
      uploadingImage ||
      hasPendingClarification
    )
      return;

    const currentImageUrl = imageUrl;
    const currentImagePreview = imagePreview;
    setQuery("");
    setImagePreview(null);
    setImageUrl(null);
    await submitMessage(message, currentImageUrl, currentImagePreview);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await trySubmit();
  }

  // Auto-grows with content, capped at max-h (CSS below) — same feel as
  // ChatGPT's composer. Re-measured whenever `query` changes, including the
  // reset to "" after a send, so the box collapses back down too.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [query]);

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void trySubmit();
    }
  }

  // A clarification answer — button click or the dedicated input's own
  // submit (see ClarificationPrompt) — is just the buyer's next message.
  // Never resends a prior image: each turn's image is per-submission only
  // (same as any other typed follow-up already works — history is
  // text-only, see SearchHistoryTurn).
  function handleClarificationAnswer(text: string) {
    void submitMessage(text, null, null);
  }

  const lastTurn = turns[turns.length - 1];
  // Only the LATEST turn's clarification is actionable — once answered, a
  // new turn is appended and this naturally flips back to false.
  const hasPendingClarification =
    !!lastTurn &&
    lastTurn.phase === "done" &&
    !lastTurn.error &&
    !!lastTurn.clarification;

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

      <div className="flex flex-col bg-white rounded-[28px] border border-gray-200 shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-shadow">
        <textarea
          ref={textareaRef}
          rows={1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          disabled={hasPendingClarification}
          placeholder={
            hasPendingClarification
              ? "Answer the question above to continue…"
              : collapsed
                ? "Ask a follow-up, or search for something else…"
                : "e.g. 'Tecno fast charger near me'"
          }
          className="w-full resize-none bg-transparent outline-none text-[15px] leading-6 text-gray-900 placeholder:text-gray-400 px-5 pt-4 pb-1 max-h-40 overflow-y-auto disabled:opacity-50"
        />
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
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
            disabled={uploadingImage || hasPendingClarification}
            title="Search with a photo"
            className="shrink-0 w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <Camera size={17} />
          </button>
          <button
            type="submit"
            disabled={
              (!query.trim() && !imageUrl) ||
              isSending ||
              uploadingImage ||
              hasPendingClarification
            }
            title="Send"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white transition-colors"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="h-dvh bg-white flex flex-col overflow-hidden">
      <LocationPermissionModal
        open={showLocationModal}
        onAllow={handleAllowLocation}
        onDismiss={() => setShowLocationModal(false)}
      />
      <header className="flex items-center justify-between gap-3 px-4 sm:px-8 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 sm:py-2.5 shrink-0 bg-white border-b border-gray-100 z-10">
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
          <div className="text-center mb-6 max-w-2xl">
            <h1 className="text-[28px] sm:text-4xl font-semibold text-[#023337] mb-2 tracking-tight">
              What are you looking for?
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              Describe it, tell us where you are, and we&apos;ll find the
              nearest vendor who actually has it.
            </p>
          </div>
          <div className="w-full max-w-3xl">{inputForm}</div>
        </main>
      ) : (
        <>
          {/* Newest content stays pinned to the bottom (bottomRef) as the
              thread grows, so scrolling reads bottom-up like a chat. */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-6">
            <div className="max-w-3xl lg:max-w-4xl mx-auto space-y-8">
              {turns.map((turn, i) => (
                <ConversationTurnView
                  key={turn.id}
                  turn={turn}
                  isLatest={i === turns.length - 1}
                  onAnswerClarification={handleClarificationAnswer}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="shrink-0 px-5 sm:px-8 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="max-w-3xl lg:max-w-4xl mx-auto">{inputForm}</div>
          </div>
        </>
      )}
    </div>
  );
}
