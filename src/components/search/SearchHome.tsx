"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateUUID } from "@/lib/uuid";
import { runSearchStream } from "@/lib/searchStream";
import { uploadProductMedia, validateImageFile } from "@/lib/cloudinary";
import { VendorResultCard } from "@/components/search/VendorResultCard";
import { StoreResultCard } from "@/components/search/StoreResultCard";
import { ExternalBusinessCard } from "@/components/search/ExternalBusinessCard";
import { StoreProductCard } from "@/components/search/StoreProductCard";
import { CardCarousel } from "@/components/search/CardCarousel";
import { ClarificationPrompt } from "@/components/search/ClarificationPrompt";
import { BuyerRequestOfferWidget } from "@/components/search/BuyerRequestOfferWidget";
import { BuyerInstallPrompt } from "@/components/search/BuyerInstallPrompt";
import { useUserStore } from "@/store/userStore";
import { usersApi } from "@/services/users";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import type {
  BuyerLocation,
  BuyerRequestOffer,
  Clarification,
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  SearchHistoryTurn,
  StoreMatch,
  StoreProductItem,
  VendorMatch,
} from "@/types/search";
import { CompassIcon, MapPinIcon } from "@/components/icons";
// Composer icons only (upload spinner, remove-photo, camera, send) are
// lucide-react, not the custom set — reverted 2026-08-17 per explicit
// request, scoped to just this textarea; every other icon on this page
// stays on @/components/icons. See [[custom_icon_system]].
import { ArrowUp, Camera, Loader2, X } from "lucide-react";

// `products` decides the noun: a pure service turn (e.g. "haircut near me")
// shouldn't be headed "Products", and a turn can genuinely mix both kinds
// (retrieval is embeddings-based across all listings regardless of kind), so
// this can't just be a static "product vs service" flag passed in from the
// call site.
// Mirrors route.ts's own RECENT_STATUS_MEMORY cap — see shownStatusesRef's
// comment below for why the client tracks this at all.
const RECENT_STATUS_MEMORY = 8;

// Shared background for every pure-text AI message — clarifying questions,
// the "nothing found" dead end, the buyer-request offer/confirmation — but
// deliberately NOT the result cards (products/stores/vendors stay exactly
// as they render today, unboxed). Matches slate-100/#F1F5F9, the app's
// existing light-surface token, so it reads as "a message from Velte" set
// against the plain white chat background, not a competing card style.
const AI_MESSAGE_BUBBLE_CLASS = "bg-slate-100 rounded-2xl px-4 py-3 max-w-md";

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

// A store card, plus the "View matching service(s)" link when this store
// has any (see StoreResultCard's own props) — the thread panel itself is
// NOT rendered here anymore (2026-08-16, carousel rework): a carousel slide
// is only ~260-280px wide, nowhere near enough for the thread's own layout,
// so the panel now renders once, full-width, below the whole carousel (see
// MatchingServicesThread + its call sites) rather than cramped inside a
// slide. This wrapper just forwards the open/toggle state through to the
// card's own link.
function StoreWithServices({
  store,
  services,
  searchQuery,
  isServicesOpen,
  onToggleServices,
}: {
  store: StoreMatch;
  services: VendorMatch[];
  searchQuery: string | null;
  isServicesOpen: boolean;
  onToggleServices: () => void;
}) {
  return (
    <StoreResultCard
      match={store}
      searchQuery={searchQuery}
      matchingServicesCount={services.length}
      matchingServicesOpen={isServicesOpen}
      onToggleMatchingServices={
        services.length > 0 ? onToggleServices : undefined
      }
    />
  );
}

// The "matching services" thread itself — exact same trunk/branch/node
// visual as before the carousel rework, just re-parented: it used to sit
// directly under its one store card (guaranteed adjacent, since stores
// rendered in a plain stacked/grid layout); now that stores scroll
// horizontally, the card that opened this can be scrolled anywhere in the
// row, so visual adjacency can't carry the "this belongs to that store"
// context anymore — the heading now names the store explicitly instead.
// `panelRef` is what ConversationTurnView scrolls into view on open (see
// its own effect) for a buyer whose card-click has this panel appearing
// below their current scroll position.
function MatchingServicesThread({
  storeName,
  services,
  panelRef,
}: {
  storeName: string;
  services: VendorMatch[];
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={panelRef} className="pl-1">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 pl-9">
        {services.length === 1 ? "Matching service" : "Matching services"} —{" "}
        {storeName}
      </p>
      {services.map((svc, i) => {
        const isLast = i === services.length - 1;
        return (
          <div key={svc.productId} className="flex">
            {/* Thread trunk column — stretches to the card's own height
                (flex row default align-items: stretch), so top-1/2 here
                always lands on that card's actual vertical center, no
                fixed pixel math. Line above the center connects up to
                the previous item (or the heading, for the first one);
                line below is omitted past the last item so the trunk
                visibly terminates instead of trailing off. The branch +
                node sit at that same center, reaching sideways into the
                card — the actual "this hangs off the thread" cue, not
                just a rail running past it. */}
            <div className="w-8 shrink-0 relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-1/2 w-px bg-orange-200" />
              {!isLast && (
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 bottom-0 w-px bg-orange-200" />
              )}
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-5 h-px bg-orange-200" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-orange-400 ring-4 ring-orange-50" />
            </div>
            <div className="flex-1 min-w-0 max-w-xs pb-3">
              <VendorResultCard
                match={svc}
                showViewStore={false}
                showChatButton={false}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
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

// Shared by paragraph blocks and list items alike — a block/item can itself
// span multiple source lines (see the "\n"-joined continuation lines pushed
// in the parse loop below), so both need the same "one <br/> per embedded
// newline, bold parsed within each line" treatment rather than duplicating
// it per call site.
function renderMultilineBold(
  text: string,
  keyPrefix: string,
): React.ReactNode[] {
  return text.split("\n").map((line, j) => (
    <span key={`${keyPrefix}-${j}`}>
      {j > 0 && <br />}
      {renderInlineBold(line, `${keyPrefix}-${j}`)}
    </span>
  ));
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
    // Strips a leading markdown heading marker ("#" through "######") if
    // the model writes one anyway despite the system prompt saying never
    // to (found live) — there's no heading treatment to render it AS, so
    // this just degrades to a plain line rather than leaving literal "#"
    // characters visible, same defensive spirit as renderInlineBold below
    // handling "**bold**" instead of trusting the model never to send it.
    const line = rawLine.trim().replace(/^#{1,6}\s+/, "");
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
    } else if (last?.type === "ul" || last?.type === "ol") {
      // A plain line right after a list item is that item's OWN
      // continuation (a sub-detail on its own line), not a new paragraph —
      // append it to the last item instead of starting a stray "p" block.
      // Ending the list here would split a single numbered/bulleted list
      // into two separate <ol>/<ul> elements, and since each one numbers
      // itself independently (list-decimal), the second list would render
      // starting back at "1." instead of continuing the count — exactly the
      // "every item shows 1" bug this avoids.
      last.items[last.items.length - 1] += `\n${line}`;
    } else {
      blocks.push({ type: "p", lines: [line] });
    }
  }

  return (
    <div className="text-[15px] sm:text-base text-gray-800 leading-7 space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{renderMultilineBold(item, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{renderMultilineBold(item, `${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>{renderMultilineBold(block.lines.join("\n"), `${i}`)}</p>
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
  // The real uploaded (Cloudinary) URL behind imagePreview's local blob —
  // imagePreview alone can't be reused past this render (it's a client-only
  // object URL). Needed so BuyerRequestOfferWidget can attach the same
  // photo to a buyer request created from this turn.
  imageUrl: string | null;
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
  // A small bonus bucket of real vendors slightly further out than `stores`
  // (never the same ones) — see SearchStreamEvent's own furtherStores
  // comment. Rendered as its own clearly-labeled section, never blended
  // indistinguishably into `stores`.
  furtherStores: StoreMatch[];
  // The businessType actually searched for this turn (e.g. "tailor") — null
  // when searchStores wasn't called. Passed to StoreResultCard only for a
  // pure vendor/store result (turn.products empty), so its WhatsApp message
  // reflects what the buyer was actually looking for.
  storesQuery: string | null;
  // The storefront of each matched product's own vendor (see route.ts) — one
  // per unique vendor already in `products`, so a matched item also surfaces
  // who actually sells it, not just the WhatsApp contact already on its card.
  productStores: StoreMatch[];
  // Each matched store's own service listing(s) that match what the buyer
  // asked for (see route.ts's getMatchingServicesForStores) — rendered as a
  // companion card under that store's own card, grouped by vendorId.
  storeServices: VendorMatch[];
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
  // Non-null when createBuyerRequest ran this turn — see BuyerRequestOffer's
  // own comment and BuyerRequestOfferWidget, which renders this.
  buyerRequestOffer: BuyerRequestOffer | null;
  // True when offerBuyerRequestTool ran this turn (see its own comment) —
  // the reach-out offer is being made in `reply`'s text this turn. Used
  // below to suppress externalStoreSuggestions cards: Buyer Requests come
  // first, Google Places only surfaces if the buyer declines on a later
  // turn (that turn re-searches with this false again).
  buyerRequestOffered: boolean;
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
  onLocationShared,
  onBuyerRequestResolved,
  buyerLocation,
  expandedServicesVendorId,
  onToggleServices,
}: {
  turn: ConversationTurn;
  isLatest: boolean;
  onAnswerClarification: (text: string) => void;
  onLocationShared: (location: BuyerLocation) => void;
  onBuyerRequestResolved: (offer: BuyerRequestOffer) => void;
  // The buyer's device location, if granted earlier this session — passed
  // straight through to BuyerRequestOfferWidget below so a request created
  // from THIS turn can use it (see that widget's own comment). Lives in
  // SearchHome's own ref, not this component's state.
  buyerLocation: BuyerLocation | undefined;
  // Which store's "matching services" panel is open, if any, across the
  // WHOLE conversation, not just this turn — lifted up to SearchHome (see
  // its own comment) so opening one on any turn closes whichever was open
  // on any other, rather than each turn tracking its own independently and
  // leaving an earlier turn's panel visibly stuck open.
  expandedServicesVendorId: string | null;
  onToggleServices: (vendorId: string) => void;
}) {
  // Scrolls the panel into view the moment it opens — a buyer who clicked
  // "View matching services" on a card scrolled into the middle of a
  // carousel, or who's scrolled the page itself away from where the panel
  // renders (below the whole carousel row), would otherwise see nothing
  // happen. `block: "nearest"` rather than "center"/"start" — just enough
  // to bring it on screen, not a jarring re-center of the whole page.
  const servicesThreadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (expandedServicesVendorId) {
      servicesThreadRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [expandedServicesVendorId]);

  return (
    <div className="space-y-4">
      {/* The buyer's own message — right-aligned, shaded with the app's
          accent color, like a chat bubble. The AI's response below sits in
          its own row with an avatar, plain text/cards rather than a bubble —
          same structure as ChatGPT's thread. */}
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%] bg-orange-100/70 rounded-3xl px-4 py-2.5 flex items-start gap-2.5">
          {turn.imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={turn.imagePreview}
              alt="Search photo"
              className="w-14 h-14 rounded-lg object-cover shrink-0 border border-orange-200"
            />
          )}
          {turn.query && (
            <p className="text-[15px] sm:text-base text-[#023337] leading-relaxed flex items-center gap-1.5">
              {/* Same MapPinIcon Settings' own location field uses (see
                  [[custom_icon_system]]) — was a literal 📍 emoji character
                  baked into the submitted text before this. */}
              {turn.query === "Shared my location" && (
                <MapPinIcon size={16} className="text-orange-600 shrink-0" />
              )}
              {turn.query}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3">
        {/* Velte's own avatar — same image for the status/"thinking" phase
            and the final reply/results, since both are this one persona
            talking, just at different points in the same turn. */}
        <img
          src="/velte_ai_assistant.png"
          alt="Velte"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0"
        />
        <div className="flex-1 min-w-0 pt-0.5">
          {turn.phase === "loading" && (
            <div className="min-w-0">
              <span className="status-shimmer block truncate text-[15px] font-medium">
                {turn.status}
              </span>
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
                        {turn.vendorProducts.length > 1 ? (
                          <CardCarousel
                            items={turn.vendorProducts}
                            getKey={(item) => item.productId}
                            renderItem={(item) => (
                              <StoreProductCard
                                match={item}
                                storeName={turn.vendorProductsStore!.name}
                                storeWhatsapp={
                                  turn.vendorProductsStore!.whatsapp
                                }
                                vendorId={turn.vendorProductsStore!.vendorId}
                              />
                            )}
                          />
                        ) : (
                          <div className="max-w-[280px]">
                            <StoreProductCard
                              match={turn.vendorProducts[0]}
                              storeName={turn.vendorProductsStore.name}
                              storeWhatsapp={turn.vendorProductsStore.whatsapp}
                              vendorId={turn.vendorProductsStore.vendorId}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  {turn.products.length > 0 &&
                    (() => {
                      const groups = groupProductsByVendor(
                        turn.products,
                        turn.productStores,
                      );
                      // Each group's own card content — product(s) + "Sold
                      // by" companion — unchanged from before the carousel
                      // rework, just stacked vertically (space-y-3) instead
                      // of tiled in a responsive grid: once a group can sit
                      // in its own fixed-width carousel slide, there's no
                      // longer a row wide enough for 2-3 columns to matter.
                      const renderGroup = (group: (typeof groups)[number]) => (
                        <div className="space-y-3">
                          <div className="space-y-3">
                            {group.products.map((match) => (
                              <VendorResultCard
                                key={match.productId}
                                match={match}
                                // Hidden here once a "Sold by" store card
                                // exists below — that card is now where View
                                // Store lives. Kept for a service-only group
                                // (group.store is always null there — see
                                // route.ts), which has no store card at all.
                                showViewStore={!group.store}
                              />
                            ))}
                          </div>
                          {group.store ? (
                            <div className="pl-3 border-l-2 border-orange-100 space-y-2">
                              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                                Sold by
                              </p>
                              <StoreResultCard match={group.store} />
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
                      );
                      return (
                        <div className="space-y-3">
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
                          {groups.length > 1 ? (
                            <CardCarousel
                              items={groups}
                              getKey={(group) => group.vendorId}
                              renderItem={renderGroup}
                              slideClassName="w-[280px] sm:w-[300px]"
                            />
                          ) : (
                            <div className="max-w-[300px]">
                              {renderGroup(groups[0])}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  {turn.weakProducts.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        A couple more options — not an exact match
                      </h2>
                      {turn.weakProducts.length > 1 ? (
                        <CardCarousel
                          items={turn.weakProducts}
                          getKey={(match) => match.productId}
                          renderItem={(match) => (
                            <VendorResultCard match={match} />
                          )}
                        />
                      ) : (
                        <div className="max-w-[280px]">
                          <VendorResultCard match={turn.weakProducts[0]} />
                        </div>
                      )}
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
                      {turn.stores.length > 1 ? (
                        <CardCarousel
                          items={turn.stores}
                          getKey={(store) => store.storeId}
                          renderItem={(store) => (
                            <StoreWithServices
                              store={store}
                              services={turn.storeServices.filter(
                                (s) => s.vendorId === store.vendorId,
                              )}
                              // Only when this is a pure vendor/store result
                              // (no product attached) — a dual-intent turn
                              // already has a product for the buyer to
                              // reference instead.
                              searchQuery={
                                turn.products.length === 0
                                  ? turn.storesQuery
                                  : null
                              }
                              isServicesOpen={
                                expandedServicesVendorId === store.vendorId
                              }
                              onToggleServices={() =>
                                onToggleServices(store.vendorId)
                              }
                            />
                          )}
                        />
                      ) : (
                        // A lone result skips the carousel (nothing to
                        // scroll to) but still caps to a normal card width
                        // — matches the carousel's own slide width, so "1
                        // result" and "many results" read as the same
                        // design, not two different ones.
                        <div className="max-w-[280px]">
                          <StoreWithServices
                            store={turn.stores[0]}
                            services={turn.storeServices.filter(
                              (s) => s.vendorId === turn.stores[0].vendorId,
                            )}
                            searchQuery={
                              turn.products.length === 0
                                ? turn.storesQuery
                                : null
                            }
                            isServicesOpen={
                              expandedServicesVendorId ===
                              turn.stores[0].vendorId
                            }
                            onToggleServices={() =>
                              onToggleServices(turn.stores[0].vendorId)
                            }
                          />
                        </div>
                      )}
                      {(() => {
                        const activeStore = turn.stores.find(
                          (s) => s.vendorId === expandedServicesVendorId,
                        );
                        const activeServices = activeStore
                          ? turn.storeServices.filter(
                              (s) => s.vendorId === activeStore.vendorId,
                            )
                          : [];
                        if (!activeStore || activeServices.length === 0)
                          return null;
                        return (
                          <MatchingServicesThread
                            storeName={activeStore.name}
                            services={activeServices}
                            panelRef={servicesThreadRef}
                          />
                        );
                      })()}
                    </div>
                  )}
                  {turn.furtherStores.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Also available further out
                      </h2>
                      {turn.furtherStores.length > 1 ? (
                        <CardCarousel
                          items={turn.furtherStores}
                          getKey={(store) => store.storeId}
                          renderItem={(store) => (
                            <StoreWithServices
                              store={store}
                              services={turn.storeServices.filter(
                                (s) => s.vendorId === store.vendorId,
                              )}
                              searchQuery={
                                turn.products.length === 0
                                  ? turn.storesQuery
                                  : null
                              }
                              isServicesOpen={
                                expandedServicesVendorId === store.vendorId
                              }
                              onToggleServices={() =>
                                onToggleServices(store.vendorId)
                              }
                            />
                          )}
                        />
                      ) : (
                        <div className="max-w-[280px]">
                          <StoreWithServices
                            store={turn.furtherStores[0]}
                            services={turn.storeServices.filter(
                              (s) =>
                                s.vendorId === turn.furtherStores[0].vendorId,
                            )}
                            searchQuery={
                              turn.products.length === 0
                                ? turn.storesQuery
                                : null
                            }
                            isServicesOpen={
                              expandedServicesVendorId ===
                              turn.furtherStores[0].vendorId
                            }
                            onToggleServices={() =>
                              onToggleServices(turn.furtherStores[0].vendorId)
                            }
                          />
                        </div>
                      )}
                      {(() => {
                        const activeStore = turn.furtherStores.find(
                          (s) => s.vendorId === expandedServicesVendorId,
                        );
                        const activeServices = activeStore
                          ? turn.storeServices.filter(
                              (s) => s.vendorId === activeStore.vendorId,
                            )
                          : [];
                        if (!activeStore || activeServices.length === 0)
                          return null;
                        return (
                          <MatchingServicesThread
                            storeName={activeStore.name}
                            services={activeServices}
                            panelRef={servicesThreadRef}
                          />
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : turn.externalStoreSuggestions.length > 0 &&
                !turn.buyerRequestOffered ? (
                // No Velte vendor matched — real nearby businesses via Google
                // Places (searchStores Tier 5), visibly distinct from an actual
                // Velte listing (see ExternalBusinessCard). `!buyerRequestOffered`
                // is the "Buyer Requests come first" gate (2026-08-16, see
                // offerBuyerRequestTool's own comment): Tier 5 can come back in
                // the SAME tool result as an otherwise-empty search, but on the
                // turn where the model is making the reach-out offer instead,
                // these stay hidden and this falls through to the dead-end
                // Compass card below — visually identical whether or not Places
                // secretly found something, so the offer is always what the
                // buyer sees first. They only render once a later turn
                // re-searches with the offer declined (buyerRequestOffered
                // false again that time).
                <>
                  <FormattedReply text={turn.reply} />
                  {turn.externalStoreSuggestions.length > 1 ? (
                    <CardCarousel
                      items={turn.externalStoreSuggestions}
                      getKey={(match) => match.name + match.address}
                      renderItem={(match) => (
                        <ExternalBusinessCard match={match} />
                      )}
                    />
                  ) : (
                    <div className="max-w-[280px]">
                      <ExternalBusinessCard
                        match={turn.externalStoreSuggestions[0]}
                      />
                    </div>
                  )}
                </>
              ) : turn.buyerRequestOffer ? (
                // createBuyerRequest ran this turn (see systemPrompt.ts) —
                // real agent action, not a dead end, so this gets the same
                // message-bubble treatment as every other pure-text reply,
                // never the "nothing found anywhere" Compass treatment.
                <div className={AI_MESSAGE_BUBBLE_CLASS}>
                  <FormattedReply text={turn.reply} />
                </div>
              ) : turn.buyerRequestOffered ? (
                // offerBuyerRequest ran this turn (see offerBuyerRequestTool's
                // own comment) — the model is actively making the reach-out
                // offer in `reply`'s text right now. There's a real next step
                // on the table, so this is NOT a dead end either — same
                // message-bubble treatment, not the "nothing found anywhere"
                // Compass case below. The Yes/No pair turns that next step
                // into an actual click instead of the buyer having to type
                // "yes" — both just submit canned text as the next message,
                // same mechanism ClarificationPrompt's "choice" pills already
                // use (see handleClarificationAnswer), so no new plumbing
                // was needed for this. Only rendered on the latest turn, same
                // gate every other still-actionable widget in this thread
                // uses — an answered offer shouldn't still show buttons on
                // scrollback.
                <div className={cn(AI_MESSAGE_BUBBLE_CLASS, "space-y-3")}>
                  <FormattedReply text={turn.reply} />
                  {isLatest && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          onAnswerClarification("Yes, find someone")
                        }
                        className="px-4 py-2 rounded-full border border-orange-200 bg-orange-50/50 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
                      >
                        Yes, find someone
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAnswerClarification("No thanks, that's okay")
                        }
                        className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      >
                        No thanks
                      </button>
                    </div>
                  )}
                </div>
              ) : !turn.toolCalled ? (
                // The model asked a clarifying question instead of searching
                // (see systemPrompt.ts) — same message-bubble treatment as
                // the text above a result grid, never the "nothing found
                // anywhere" case below: the conversation is still open, not
                // a dead end.
                <div className={AI_MESSAGE_BUBBLE_CLASS}>
                  <FormattedReply text={turn.reply} />
                </div>
              ) : (
                // A real search ran and came up completely empty, with no
                // further move on the table (no reach-out offer, no
                // clarification) — genuinely nothing to show. Still just a
                // message, not product/vendor cards, so it gets the same
                // message-bubble treatment as every other pure-text reply
                // (see AI_MESSAGE_BUBBLE_CLASS) rather than sitting bare —
                // only the actual result cards stay unboxed.
                <div
                  className={cn(
                    AI_MESSAGE_BUBBLE_CLASS,
                    "flex items-start gap-2.5",
                  )}
                >
                  <CompassIcon
                    size={18}
                    className="text-orange-400 shrink-0 mt-0.5"
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
                  onLocationShared={onLocationShared}
                />
              )}
              {turn.buyerRequestOffer && isLatest && (
                <BuyerRequestOfferWidget
                  offer={turn.buyerRequestOffer}
                  imageUrl={turn.imageUrl}
                  location={buyerLocation}
                  onResolved={onBuyerRequestResolved}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// The idle screen's own greeting — introduces the assistant by name so
// "Velte" isn't only ever a silent avatar next to replies. Shown as plain,
// static text (no typing animation).
const VELUX_GREETING = "Hi, I'm Velte — what are you looking for?";
const VELUX_SUBTEXT =
  "Describe it in your own words or a photo — I'll match it against real vendor inventory nearby, ranked by meaning, distance and trust. Never guessed, never invented.";

// Velte's buyer-facing search (build-order step d/e), at /chat —
// `/` is now the marketing homepage. Structured as a conversation: each
// submission appends a turn (ConversationTurn) rather than replacing the
// last one, and a short text-only history is sent back to the model so
// follow-ups ("cheaper", "in red instead") have context.
//
// Deliberately never persisted anywhere (2026-08-18 — buyers have no
// account to save it to, and stay anonymous otherwise): a refresh always
// starts a fresh conversation. The one thing that outlives a single
// conversation is a Buyer Request (see BuyerRequestOfferWidget) — that's
// its own explicit, named action, not a side effect of chatting.
export function SearchHome() {
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const isSending = turns.some((t) => t.phase === "loading");

  // Which store's "matching services" panel is open, if any — across the
  // WHOLE conversation, not per turn (see ConversationTurnView's own
  // comment on why this lives here and not lower): at most one open at a
  // time, so opening one on any turn closes whichever was open on any
  // other turn, not just within the same one.
  const [expandedServicesVendorId, setExpandedServicesVendorId] = useState<
    string | null
  >(null);
  function toggleServices(vendorId: string) {
    setExpandedServicesVendorId((cur) => (cur === vendorId ? null : vendorId));
  }
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

  // Every /api/search call is otherwise stateless, so without this the
  // server's own within-turn status-repeat avoidance (see statusPhrases.ts's
  // pickAvoiding) resets blank on every new search — the same status line
  // could resurface search after search in one session. A plain ref, not
  // state: it's sent along on the NEXT call, never rendered itself. Mirrors
  // route.ts's own RECENT_STATUS_MEMORY cap.
  const shownStatusesRef = useRef<string[]>([]);

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

  // Set once the buyer actually shares their location via a "location"
  // clarification (see handleLocationShared) — never requested up front on
  // page load (the OLD permission-gated LocationPermissionModal +
  // getBuyerLocationOnce, both removed 2026-08, see git history), only when
  // the AI itself decides a specific search genuinely needs it (see
  // systemPrompt.ts's location rule). A plain ref, not state: it's read
  // fresh inside submitMessage on every call once set, so every later
  // search this session reuses it automatically without re-rendering
  // anything or asking again — same "device location known" treatment the
  // backend already gives a real device location (resolveBuyerCoords.ts).
  const buyerLocationRef = useRef<BuyerLocation | null>(null);

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
      const url = await uploadProductMedia(file, "velte/search-queries");
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
    const turnId = generateUUID();

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
        imageUrl: currentImageUrl,
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
        furtherStores: [],
        storesQuery: null,
        productStores: [],
        storeServices: [],
        productsMatchTier: null,
        storesMatchTier: null,
        productsMatchQuality: undefined,
        storesMatchQuality: undefined,
        externalStoreSuggestions: [],
        vendorProducts: [],
        vendorProductsStore: null,
        buyerRequestOffer: null,
        buyerRequestOffered: false,
        contextNote: null,
        error: null,
      },
    ]);

    await runSearchStream(
      {
        message,
        imageUrl: currentImageUrl ?? undefined,
        // Undefined until the buyer actually shares their location (see
        // buyerLocationRef's own comment) — the backend resolves a named
        // location from the query text, or asks via a "location"
        // clarification, when this is absent (see systemPrompt.ts).
        buyerLocation: buyerLocationRef.current ?? undefined,
        history,
        recentStatuses: shownStatusesRef.current,
      },
      {
        onStatus: (text) => {
          updateTurn(turnId, { status: text });
          shownStatusesRef.current = [...shownStatusesRef.current, text].slice(
            -RECENT_STATUS_MEMORY,
          );
        },
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
          const dedupedFurtherStores = event.furtherStores.filter(
            (s) => !productVendorIds.has(s.vendorId),
          );
          // A machine-only breadcrumb for a LATER turn's history — lets the
          // model resolve a future "what do they sell" back to this exact
          // store via getVendorProducts, without needing the buyer-facing
          // reply text to ever name the vendor (it deliberately doesn't).
          // Includes productStores too (guaranteed disjoint from
          // dedupedStores by vendor) — a store surfaced only via its
          // matched product's own card should still resolve the same way.
          const allStoresFound = [
            ...dedupedStores,
            ...dedupedFurtherStores,
            ...event.productStores,
          ];
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
            furtherStores: dedupedFurtherStores,
            storesQuery: event.storesQuery,
            productStores: event.productStores,
            storeServices: event.storeServices,
            productsMatchTier: event.productsMatchTier,
            storesMatchTier: event.storesMatchTier,
            productsMatchQuality: event.productsMatchQuality,
            storesMatchQuality: event.storesMatchQuality,
            externalStoreSuggestions: event.externalStoreSuggestions,
            vendorProducts: event.vendorProducts,
            vendorProductsStore: event.vendorProductsStore,
            buyerRequestOffer: event.buyerRequestOffer,
            buyerRequestOffered: event.buyerRequestOffered,
            contextNote,
          });
        },
        onError: (errorMessage) => {
          updateTurn(turnId, { phase: "done", error: errorMessage });
        },
      },
    );
  }

  // One-shot handoff from the homepage's own Velte input (Hero.tsx) and any
  // other "?q=…" link into /chat — read directly off window.location
  // rather than useSearchParams() so this already-fully-client component
  // doesn't need a Suspense boundary just for a one-time initial read.
  // `auto=1` submits it immediately (a real search, not a prefilled draft);
  // without it, the text just lands in the composer for the buyer to edit
  // first. Strips both params from the URL afterward so a refresh doesn't
  // resend/reprefill the same query. Skipped entirely when `?c=` (resume,
  // above) is also present — the two links are mutually exclusive in
  // practice, but resuming a real conversation should always win.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("c")) return;
    const q = params.get("q");
    if (!q) return;
    if (params.get("auto") === "1") {
      // Deliberate: this IS the mount-time handoff (Hero.tsx's own composer
      // navigates here with `auto=1` specifically to fire a real search
      // immediately, not just prefill the composer) — there's no external
      // event to defer this to a callback for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void submitMessage(q, null, null);
    } else {
      setQuery(q);
    }
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // ChatGPT's composer.
  const autoResize = useAutoResizeTextarea(query);

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

  // The "location" clarification's own answer path (LocationShareAction, via
  // ClarificationPrompt) — sharing location isn't really a typed reply, but
  // it's still just the buyer's next message from the conversation's point
  // of view, so it goes through the exact same submitMessage as everything
  // else. Two things happen: the coordinates get cached (buyerLocationRef,
  // read fresh inside submitMessage) so THIS and every later search this
  // session uses them automatically without asking again; and a short,
  // honest visible message stands in for "I shared my location" — the
  // buyer really did just do that, so it reads as their own turn rather
  // than a fabricated one. The toast is the "let them know it worked"
  // moment that doesn't depend on anything staying mounted (the widget
  // itself unmounts the instant this appends a new turn).
  function handleLocationShared(location: BuyerLocation) {
    buyerLocationRef.current = location;
    toast.success("Got your location!");
    void submitMessage("Shared my location", null, null);
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
          {...autoResize}
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
          className="w-full resize-none bg-transparent outline-none text-base leading-6 text-gray-900 placeholder:text-gray-400 px-5 pt-4 pb-1 max-h-40 overflow-y-auto disabled:opacity-50"
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
    // `h-full`, not `h-dvh` — this is no longer the whole screen, just the
    // content column beside chat/layout.tsx's own sidebar (that layout owns
    // the actual viewport-height boundary now; ChatHeader replaced the
    // <header> that used to live here). See chat/layout.tsx's own comment.
    <div className="h-full bg-white flex flex-col overflow-hidden">
      <BuyerInstallPrompt />

      {!collapsed ? (
        <main className="flex-1 flex flex-col items-center justify-center px-5">
          {/* The idle screen reads as Velte itself greeting the buyer — same
              avatar-left, bubble-right chat layout as a real conversation
              turn (see ConversationTurnView's own `items-start gap-3` row),
              not a centered marketing headline. Everything Velte "says" —
              the greeting AND the explanation — lives inside the one
              bubble, same as a single real chat message would hold both. */}
          <div className="flex items-start gap-3 sm:gap-4 mb-6 max-w-xl w-full text-left">
            <img
              src="/velte_ai_assistant.png"
              alt="Velte"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover shadow-md shadow-gray-300/40 shrink-0"
            />
            <div className="bg-white border border-gray-100 shadow-sm rounded-3xl rounded-tl-lg px-4 py-3 sm:px-5 sm:py-4 flex-1 min-w-0">
              <h1 className="text-[16px] sm:text-lg font-semibold text-[#023337] leading-snug">
                {VELUX_GREETING}
              </h1>
              <p className="text-gray-500 text-sm sm:text-[15px] leading-relaxed mt-1.5">
                {VELUX_SUBTEXT}
              </p>
            </div>
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
                  onLocationShared={handleLocationShared}
                  buyerLocation={buyerLocationRef.current ?? undefined}
                  expandedServicesVendorId={expandedServicesVendorId}
                  onToggleServices={toggleServices}
                  onBuyerRequestResolved={(offer) =>
                    updateTurn(turn.id, { buyerRequestOffer: offer })
                  }
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
