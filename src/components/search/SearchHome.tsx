"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
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
import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerStore } from "@/store/buyerStore";
import type { Buyer } from "@/types/buyer";
import {
  pickAvoiding,
  gettingLocationPhrase,
  scanningVendorsPhrase,
  sendingOtpPhrase,
  checkingOtpPhrase,
  creatingRequestPhrase,
  noMatchRequestPhrase,
  initiatingBackgroundItemPhrase,
  backgroundItemPendingPhrase,
  backgroundItemResolvedPhrase,
} from "@/lib/server/ai/statusPhrases";
import type {
  BackgroundSearchItem,
  BuyerLocation,
  BuyerRequestOffer,
  Clarification,
  IdentityCapture,
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  SearchHistoryTurn,
  SearchItemOutcome,
  StoreMatch,
  StoreProductItem,
  VendorMatch,
} from "@/types/search";
import {
  CompassIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@/components/icons";
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

// submitWithLocationGate's own ask, when silently getting the buyer's
// location fails/isn't granted — client-authored (not the model's own
// phrasing) since this fires before any search or AI call even happens;
// same "varied wording, same meaning" convention as the server-side phrase
// pools in statusPhrases.ts, reusing that file's own pickAvoiding.
const LOCATION_GATE_ASK_PHRASES = [
  "Before I start — could you share your location? It just helps me find vendors actually near you.",
  "Quick thing first — sharing your location helps me match you with vendors nearby.",
  "One thing before I search — your location helps me find businesses close to you.",
  "Mind sharing your location first? It's only to find vendors near you, never to track you.",
];

// Found live: the gate used to fire even when the buyer's OWN message
// already named a place ("...in Lekki") — it only ever checked device
// geolocation, never the text itself, so it asked for something already
// given. A plain substring list, not an LLM call — the whole point of the
// gate is to decide BEFORE any AI work starts, so a round trip just to
// check this would defeat it. Not exhaustive (no LGA/ward-level list would
// be), just states + FCT + the major cities/well-known Lagos-Abuja areas a
// buyer is actually likely to type — good enough to catch the common case
// this was found on, not a claim of covering every Nigerian place name.
// Deliberately permissive about false positives (a coincidental match
// skips the ask) over false negatives (missing a real place still just
// falls through to the ordinary ask, not a hard failure).
const NIGERIAN_PLACE_NAMES = [
  "lagos",
  "abuja",
  "kano",
  "ibadan",
  "enugu",
  "port harcourt",
  "kaduna",
  "benin city",
  "warri",
  "aba",
  "onitsha",
  "abeokuta",
  "jos",
  "ilorin",
  "owerri",
  "uyo",
  "calabar",
  "asaba",
  "akure",
  "abakaliki",
  "makurdi",
  "yola",
  "sokoto",
  "maiduguri",
  "bauchi",
  "gombe",
  "minna",
  "lokoja",
  "lafia",
  "awka",
  "umuahia",
  "yenagoa",
  "ado ekiti",
  "osogbo",
  "abia",
  "adamawa",
  "akwa ibom",
  "anambra",
  "bayelsa",
  "benue",
  "borno",
  "cross river",
  "delta",
  "ebonyi",
  "edo",
  "ekiti",
  "imo",
  "jigawa",
  "katsina",
  "kebbi",
  "kogi",
  "kwara",
  "nasarawa",
  "niger state",
  "ogun",
  "ondo",
  "osun",
  "oyo",
  "plateau",
  "rivers",
  "taraba",
  "yobe",
  "zamfara",
  "fct",
  "ikeja",
  "yaba",
  "lekki",
  "ajah",
  "surulere",
  "victoria island",
  "ikoyi",
  "wuse",
  "garki",
  "maitama",
  "gwarinpa",
];
function messageNamesAPlace(message: string): boolean {
  return NIGERIAN_PLACE_NAMES.some((place) =>
    new RegExp(`\\b${place.replace(/\s+/g, "\\s+")}\\b`, "i").test(message),
  );
}

// A plain display term for a queued background item — purely for the
// floating background-item bar (see pendingBackgroundQueueRef/
// BackgroundBarState below). Deliberately NEVER fed back into the AI's
// own reply text/history — see route.ts's own comment on why that
// specifically caused a real bug (the model misreading a combined
// sentence's LAST-mentioned item as what the buyer's "yes" was agreeing
// to, instead of the actual offered one).
function backgroundItemLabel(item: BackgroundSearchItem): string {
  return item.type === "product"
    ? [item.product, ...(item.attributes ?? [])].join(" ")
    : item.businessType;
}

// A fresh, empty turn ready to show a buyer's message right away, before
// anything about it is actually known yet — `status` is the only thing
// that varies per call site (submitMessage's own "Understanding your
// request…"/"Looking at your photo…", or submitWithLocationGate's own
// gettingLocationPhrase pick while it resolves silent geolocation first).
// Pulled out specifically so the buyer's own message bubble can appear
// INSTANTLY on send, before any async work (a search, a geolocation check)
// has even started — found live: submitWithLocationGate used to await
// silent geolocation BEFORE appending anything at all, which left the
// whole screen blank (not even the buyer's own typed message showing) for
// up to several seconds on a slow/no GPS fix.
function createLoadingTurn(
  id: string,
  query: string,
  imagePreview: string | null,
  imageUrl: string | null,
  status: string,
): ConversationTurn {
  return {
    id,
    query,
    imagePreview,
    imageUrl,
    phase: "loading",
    status,
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
    interimReplies: [],
    awaitingBuyerRequestReply: false,
    contextNote: null,
    error: null,
  };
}

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
  // Standalone bubbles that arrived mid-turn, before the final event (see
  // SearchStreamEvent's own "reply" comment) — route.ts's unified dead-end
  // handler uses this to close the loop on the search that just ran while
  // it keeps working on a second, wider vendor scan underneath. Rendered in
  // order, above `status`/the final content, and kept even once the turn
  // reaches "done" (unlike `status`, which is overwritten on every new
  // status event and discarded once the turn completes).
  interimReplies: string[];
  // Mirrors SearchStreamEvent's own field of the same name — true whenever
  // the buyer's next message should route through route.ts's deterministic
  // agreement short-circuit (an offer just made, or this turn IS that
  // short-circuit's own follow-up name-ask). Copied verbatim into the next
  // call's `history` (see submitMessage's own history-building code) —
  // that's the whole mechanism, nothing else reads this client-side.
  awaitingBuyerRequestReply: boolean;
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
  onPickItem,
  expandedServicesVendorId,
  onToggleServices,
}: {
  turn: ConversationTurn;
  isLatest: boolean;
  onAnswerClarification: (text: string) => void;
  onLocationShared: (location: BuyerLocation) => void;
  // See ClarificationPrompt's own onPickItem comment — only actually
  // called for an "item_pick" clarification.
  onPickItem: (
    chosen: { item: BackgroundSearchItem; label: string },
    deferred: { item: BackgroundSearchItem; label: string },
  ) => void;
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
          same structure as ChatGPT's thread. Only rendered when there's
          actually something to show — found live: item B's own synthetic
          follow-up turn (resolveBackgroundItem, no buyer message at all,
          `query`/`imagePreview` both empty) still rendered this whole row,
          an empty rounded pill with padding but no content, which read as a
          blank "ghost" bubble flashing before the AI's own results appeared
          underneath it. */}
      {(turn.query || turn.imagePreview) && (
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
      )}

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
          {/* Standalone bubbles that arrived mid-turn (route.ts's unified
              dead-end handler — see interimReplies' own comment). Rendered
              regardless of phase: while still "loading" they sit above the
              status shimmer (the turn keeps visibly working underneath
              them), and they persist once "done" too, above the final
              reply/results — a real part of the conversation, not a
              transient status line. */}
          {turn.interimReplies.length > 0 && (
            <div className="space-y-3 mb-3">
              {turn.interimReplies.map((text, i) => (
                <div key={i} className={AI_MESSAGE_BUBBLE_CLASS}>
                  <FormattedReply text={text} />
                </div>
              ))}
            </div>
          )}

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
                //
                // 2026-08-19: `reply` now wrapped in the same
                // AI_MESSAGE_BUBBLE_CLASS every other pure-text reply gets —
                // this was a bare fragment before, the one place in this
                // whole chain a plain-text reply didn't get bubble
                // treatment (BuyerRequestOfferWidget's own no_match message
                // had the identical gap — see that file's matching fix).
                <>
                  <div className={AI_MESSAGE_BUBBLE_CLASS}>
                    <FormattedReply text={turn.reply} />
                  </div>
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
              a new turn is appended and this one's isLatest flips false.
              "name" excluded — same reasoning as "needs_identity" below:
              SearchHome.tsx's own composer takes that one over entirely
              (see nameCapture's own comment), never this inline widget. */}
              {turn.clarification &&
                turn.clarification.kind !== "name" &&
                isLatest && (
                  <ClarificationPrompt
                    clarification={turn.clarification}
                    onAnswer={onAnswerClarification}
                    onLocationShared={onLocationShared}
                    onPickItem={onPickItem}
                  />
                )}
              {/* "needs_identity" excluded — SearchHome.tsx's own composer
                  (see IdentityCapture) takes over the phone/OTP exchange
                  entirely now, narrated as ordinary follow-up turns
                  instead of an inline form widget here. This only ever
                  renders the "created" confirmation card now — see that
                  component's own comment for why "no_match"/"error" have
                  nothing left to render here either. */}
              {turn.buyerRequestOffer &&
                turn.buyerRequestOffer.status !== "needs_identity" &&
                isLatest && (
                  <BuyerRequestOfferWidget offer={turn.buyerRequestOffer} />
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
  // The actual scrolling element (the `overflow-y-auto` div wrapping the
  // turns list below) — needed as the IntersectionObserver's own `root`
  // for itemBTurnVisible's effect (see that ref's own comment): without an
  // explicit root, IntersectionObserver measures against the browser's
  // top-level viewport, not this nested scroll container, which is a
  // different box entirely once the page has its own header/sidebar/
  // composer taking up space around it — found live, this produced
  // scroll-direction-dependent nonsense (the pill popping back up while
  // scrolling FURTHER DOWN, toward the turn, not away from it) since the
  // two boxes' bounds simply don't match.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevTurnCountRef = useRef(0);
  useEffect(() => {
    if (turns.length > prevTurnCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    prevTurnCountRef.current = turns.length;
  }, [turns.length]);

  // Set once the buyer's location is known — either shared via a "location"
  // clarification (see handleLocationShared) or resolved silently up front
  // (see trySilentGeolocation/submitWithLocationGate below). A plain ref,
  // not state: it's read fresh inside submitMessage on every call once set,
  // so every later search this session reuses it automatically without
  // re-rendering anything or asking again — same "device location known"
  // treatment the backend already gives a real device location
  // (resolveBuyerCoords.ts).
  //
  // 2026-08-19: location is now checked BEFORE the first search of a
  // session even starts, not left to the AI to notice mid-search and ask
  // about (see submitWithLocationGate) — an explicit reversal of an earlier
  // decision that deliberately never asked up front (the OLD permission-
  // gated LocationPermissionModal + getBuyerLocationOnce, removed 2026-08,
  // see git history) in favor of the AI deciding case-by-case. That
  // case-by-case approach turned out unreliable in practice (the model
  // sometimes searched nationwide first and asked only as an afterthought,
  // or skipped asking entirely) — per explicit request, location is now a
  // deterministic, code-enforced gate again: silently used if permission is
  // already granted, asked for immediately otherwise, before any search
  // work begins.
  const buyerLocationRef = useRef<BuyerLocation | null>(null);
  // True once the buyer has explicitly declined to share location THIS
  // session (via the gate below, or an ordinary in-conversation location
  // clarification) — combined with buyerLocationRef being non-null, this is
  // what submitWithLocationGate checks to know location has already been
  // resolved one way or the other, so it never asks twice.
  const locationDeclinedRef = useRef(false);

  // Drives the composer's own phone/OTP identity-capture mode (2026-08-19
  // redesign, replacing BuyerRequestOfferWidget's old inline
  // BuyerPhoneVerifyForm card) — per explicit request: no separate form
  // widget floating alongside the normal composer; instead the composer
  // ITSELF swaps from the free-text textarea to a single-line phone/OTP
  // input while this is non-null, and swaps back once it resolves. Set the
  // moment a turn's `buyerRequestOffer` arrives as `needs_identity` (see
  // runSearchIntoTurn's onFinal), cleared once the request is actually
  // created (or genuinely fails) — see handleIdentitySubmit. `imageUrl` is
  // read once, off the ORIGIN turn's own image, and carried through
  // unchanged for the eventual POST /api/buyer-requests call.
  const [identityCapture, setIdentityCapture] =
    useState<IdentityCapture | null>(null);
  // The composer-turned-input's own live text while identityCapture is
  // active — a separate piece of state from `query` (the ordinary
  // composer's own text) so switching back afterward never leaves stray
  // leftover text in either box.
  const [identityValue, setIdentityValue] = useState("");
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  // Seconds left before "Resend code" is tappable again — 0 means it's
  // live. SMS delivery has a real, sometimes-lagging round trip to the
  // buyer's phone that has nothing to do with how fast our own
  // request-otp call returns (that resolves the instant the backend hands
  // it to the SMS provider, not once the text actually lands). Without a
  // cooldown, a buyer staring at a code that hasn't arrived yet just taps
  // "Resend" — which fires a genuine second send, invalidates the first
  // code, and restarts the same wait, often more than once. The cooldown
  // gives the real-world SMS lag room to resolve before that's even an
  // option. Ticked down by resendCooldownIntervalRef below.
  const RESEND_OTP_COOLDOWN_SECONDS = 45;
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const resendCooldownIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  useEffect(() => {
    return () => {
      if (resendCooldownIntervalRef.current) {
        clearInterval(resendCooldownIntervalRef.current);
      }
    };
  }, []);
  function startResendCooldown() {
    if (resendCooldownIntervalRef.current) {
      clearInterval(resendCooldownIntervalRef.current);
    }
    setResendSecondsLeft(RESEND_OTP_COOLDOWN_SECONDS);
    resendCooldownIntervalRef.current = setInterval(() => {
      setResendSecondsLeft((cur) => {
        if (cur <= 1) {
          if (resendCooldownIntervalRef.current) {
            clearInterval(resendCooldownIntervalRef.current);
            resendCooldownIntervalRef.current = null;
          }
          return 0;
        }
        return cur - 1;
      });
    }, 1000);
  }

  // Drives the composer's own name-capture mode — the createBuyerRequest
  // agreement flow's own "what's your name?" ask (systemPrompt.ts), given
  // its own `kind: "name"` clarification specifically so this can take it
  // over (see Clarification's own comment). Found live: this used to be a
  // plain `kind: "text"` clarification, which rendered ClarificationPrompt's
  // generic inline text box — a SEPARATE input floating above the composer,
  // right before the very next step (phone/OTP) already swaps that SAME
  // composer into its own dedicated input. Non-null the instant a turn's
  // `clarification` arrives as `kind: "name"` (see runSearchIntoTurn's
  // onFinal below); cleared the moment the buyer submits (handleNameSubmit
  // sends it as their next real message, same mechanism
  // handleClarificationAnswer already uses, then reverts the composer to
  // the ordinary textarea immediately after — there's no multi-step
  // progression here like phone→OTP, just the one value).
  const [nameCapture, setNameCapture] = useState<{ question: string } | null>(
    null,
  );
  const [nameValue, setNameValue] = useState("");
  const [nameSubmitting, setNameSubmitting] = useState(false);
  async function handleNameSubmit() {
    if (!nameCapture || nameSubmitting) return;
    const value = nameValue.trim();
    if (!value) return;
    setNameCapture(null);
    setNameValue("");
    setNameSubmitting(true);
    try {
      // Exactly the same path a clarification answer typed into
      // ClarificationPrompt's own inline widget already goes through — the
      // buyer's name is just their next ordinary message, nothing routes
      // this any differently once it leaves the composer.
      await submitMessage(value, null, null);
    } finally {
      setNameSubmitting(false);
    }
  }

  // A queue of every not-yet-resolved item deferred off a dual-intent turn
  // (see route.ts's own comment on where this branches off the normal
  // single-item flow) — each entry's exact spec plus a plain display label
  // for it. Per explicit design (2026-08-20 redesign, replacing an earlier
  // "hold both, reveal together" version): item A always shows its own
  // results/offer immediately, on its own turn — the queue never even
  // starts draining until item A's own flow fully concludes (its own
  // reach-out-offer exchange, if it has one, all the way to a terminal
  // status or a decline — see scheduleNextBackgroundItem's own call
  // sites), then drains one entry at a time, each waiting the same beat
  // before starting as the one before it.
  //
  // A real array/queue, not a single "item B" slot — route.ts's own
  // dual-intent branch only ever populates ONE entry today (its detection
  // is hard-wired to a single product term + a single store term; a real
  // 3-way query split is separate, not-yet-built server work), but the
  // draining logic below already walks N entries sequentially, so that
  // future work only has to populate more than one entry here, not change
  // how this side works.
  const pendingBackgroundQueueRef = useRef<
    { item: BackgroundSearchItem; label: string }[]
  >([]);
  // Guards scheduleNextBackgroundItem against firing twice for the same
  // queue entry — several call sites can all try to schedule the same
  // "item A just concluded" moment (the offerAlreadyTerminal check,
  // handleIdentitySubmit, handleClarificationAnswer's decline branch), and
  // without this a double-call would start the timer twice and shift TWO
  // entries off the queue for what should be one hop. Reset false the
  // instant a scheduled timer actually fires (startNextBackgroundItem), so
  // the NEXT queued entry (if any) can be scheduled again.
  const backgroundStartScheduledRef = useRef(false);
  // Whichever item most recently finished — item A's own label the first
  // time a queue is populated (onFinal), then whichever queued item just
  // resolved (resolveBackgroundItem) — purely for phrasing the "queued"
  // bar state's "wrapping up X, starting Y next" text below.
  const lastConcludedLabelRef = useRef("");

  // The floating pill's own live state (see the JSX render below, docked
  // directly above the composer with a margin separating the two — per
  // explicit request, replacing an earlier top-anchored version) — null
  // hides it entirely. Deliberately a floating overlay, not an in-flow bar
  // or an inline per-turn caption — per explicit request: a buyer
  // scrolling through item A's own results should never be auto-scrolled
  // to, or otherwise interrupted by, a deferred item quietly starting up
  // underneath.
  //
  // Four states, per explicit design:
  // - "queued": the next deferred item hasn't started fetching yet — shown
  //   unconditionally the whole time item A's own flow (offer exchange
  //   included) is still wrapping up, since there's no turn of the
  //   deferred item's own yet to check on-screen-ness against.
  // - "working": the deferred item's own turn now exists and is actively
  //   fetching — a cycling status line (same shimmer treatment every other
  //   in-progress line in this app uses) mirrored onto that turn's own
  //   status in the chat body at the same time, so the two always say the
  //   same thing. Only shown while that turn is off-screen (see
  //   itemBTurnVisible below) — once the buyer can see it happening in the
  //   chat body itself, the pill has nothing left to add.
  // - "pending": the deferred item resolved into something that needs the
  //   buyer's own action (an "offer" — see resolveBackgroundItem — the
  //   same Yes/No reach-out exchange a normal offer gets).
  // - "resolved": the deferred item resolved into a terminal result
  //   needing no action (results, or a real dead end — always Google
  //   Places-backed, never a silent nothing, see resolveSearchItem.ts).
  //   Still tracked/carried through as real state (for scrollToTurn, and
  //   so lastConcludedLabelRef/settleBackgroundItem's own chaining logic
  //   stays simple), but per explicit request (2026-08-20) the PILL ITSELF
  //   never renders for this state at all — see the JSX render below.
  //   There's genuinely nothing left for the buyer to act on once it's
  //   resolved, so there's nothing left to flag either; they discover the
  //   results naturally by scrolling, same as any other completed turn.
  // "working"/"pending" carry the turnId of that item's own turn, so this
  // can be scrolled to (scrollToTurn) and its own on-screen-ness tracked
  // (itemBTurnIdToWatch/itemBTurnVisible below) — per explicit request,
  // those two are a "you're missing something" flag, not a persistent
  // banner, so they only show while that turn is actually off-screen; the
  // instant the buyer scrolls it into view, the bar disappears on its
  // own, since there's nothing left to flag once it's already visible.
  type BackgroundBarState =
    | { kind: "queued"; text: string }
    | { kind: "working"; turnId: string; text: string }
    | { kind: "pending"; turnId: string; text: string }
    | { kind: "resolved"; turnId: string; text: string };
  const [backgroundBar, setBackgroundBar] = useState<BackgroundBarState | null>(
    null,
  );
  const backgroundStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const backgroundCycleRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // DOM nodes for each rendered turn, keyed by turn id — populated by the
  // wrapper div's ref callback in the turns list below (registerTurnEl).
  // The only current use is item B's own turn once it's resolved: scrolling
  // to it (scrollToTurn) and observing whether it's actually on screen
  // (itemBTurnVisible's own effect) — nothing else needs a turn's raw DOM
  // node, so this stays a plain ref map rather than per-turn component
  // state.
  const turnElRef = useRef<Map<string, HTMLDivElement>>(new Map());
  function registerTurnEl(id: string, el: HTMLDivElement | null) {
    if (el) turnElRef.current.set(id, el);
    else turnElRef.current.delete(id);
  }
  function scrollToTurn(turnId: string) {
    turnElRef.current
      .get(turnId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Whether the deferred item's own turn (backgroundBar's turnId, once
  // it's "working", "pending", or "resolved") is currently visible on
  // screen — drives whether the floating bar shows for those three states
  // (see backgroundBar's own comment). Derived to a plain id (not the
  // whole backgroundBar object) so the observer effect below only re-runs
  // when the WATCHED TURN actually changes, not on every cycling-text
  // tick.
  // "resolved" excluded too (alongside "queued") — per explicit request,
  // once a deferred item is fully done with nothing left for the buyer to
  // act on, the pill has no further reason to flag it at all, so there's
  // no visibility to track for that state either (see the JSX render
  // below for the matching "never show for resolved" condition).
  const itemBTurnIdToWatch =
    backgroundBar &&
    backgroundBar.kind !== "queued" &&
    backgroundBar.kind !== "resolved"
      ? backgroundBar.turnId
      : null;
  const [itemBTurnVisible, setItemBTurnVisible] = useState(false);
  useEffect(() => {
    if (!itemBTurnIdToWatch) {
      setItemBTurnVisible(false);
      return;
    }
    const el = turnElRef.current.get(itemBTurnIdToWatch);
    if (!el) return;
    // `root: scrollContainerRef.current` — see that ref's own comment on
    // why this can't be left as the default (the top-level browser
    // viewport, a different box than the actual scrolling element here).
    const observer = new IntersectionObserver(
      ([entry]) => setItemBTurnVisible(entry.isIntersecting),
      { root: scrollContainerRef.current, threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemBTurnIdToWatch]);

  // Clears any in-flight delayed-start timer/cycling interval, and the
  // "already scheduled" guard alongside them — called whenever one queued
  // item concludes (resolveBackgroundItem) or a fresh queue replaces the
  // old one (onFinal below), so a stale timer from an earlier dual-intent
  // turn this same conversation can never fire late against the wrong
  // item.
  function clearBackgroundTimers() {
    if (backgroundStartTimerRef.current) {
      clearTimeout(backgroundStartTimerRef.current);
      backgroundStartTimerRef.current = null;
    }
    if (backgroundCycleRef.current) {
      clearInterval(backgroundCycleRef.current);
      backgroundCycleRef.current = null;
    }
    backgroundStartScheduledRef.current = false;
  }
  useEffect(() => clearBackgroundTimers, []);

  // Called once the queue is known to have something in it — either the
  // item just ahead of the front one returned results/nothing directly
  // with no offer at all (called right away), or its own reach-out-offer
  // exchange reached a terminal status/decline (via concludeCurrentItemFlow
  // below, which is what onFinal's offerAlreadyTerminal check,
  // handleIdentitySubmit, and handleClarificationAnswer's decline branch
  // actually call) — or a PRIOR queued item just resolved and another one
  // is queued right behind it (settleBackgroundItem, inside
  // resolveBackgroundItem below). Waits the explicitly-requested ~3s beat,
  // purely so each hand-off doesn't feel instantaneous, then actually
  // starts the next queued item. A no-op if the queue is empty, or a start
  // is already scheduled — safe to call speculatively rather than needing
  // each call site to check first.
  const ITEM_B_START_DELAY_MS = 3000;
  function scheduleNextBackgroundItem() {
    if (
      pendingBackgroundQueueRef.current.length === 0 ||
      backgroundStartScheduledRef.current
    )
      return;
    backgroundStartScheduledRef.current = true;
    backgroundStartTimerRef.current = setTimeout(
      startNextBackgroundItem,
      ITEM_B_START_DELAY_MS,
    );
  }

  // The shared "an item's own reach-out-offer exchange just concluded"
  // handler — call this (instead of scheduleNextBackgroundItem directly)
  // from every place that offer can conclude (onFinal's offerAlreadyTerminal
  // check, handleIdentitySubmit, handleClarificationAnswer's decline
  // branch). Found live: answering a background item's OWN offer (the
  // pill's "pending" state — "needs a quick reply") never cleared that
  // pill afterward — scheduleNextBackgroundItem is a no-op once the queue
  // is empty (nothing left to chain to), so the "needs a quick reply" flag
  // just sat there forever, popping back up every time the buyer scrolled
  // away from that turn, even though it had genuinely already been
  // answered. If something IS still queued, this defers to
  // scheduleNextBackgroundItem exactly as before; otherwise, if the pill
  // is currently flagging a "pending" reply, this is what that reply WAS —
  // the whole deferred-item flow has now truly concluded, so the pill
  // clears outright rather than lingering. Safe to call unconditionally,
  // including for a turn with no background-item flow involved at all
  // (backgroundBar is simply null already, this is then a no-op).
  function concludeCurrentItemFlow() {
    if (pendingBackgroundQueueRef.current.length > 0) {
      scheduleNextBackgroundItem();
      return;
    }
    setBackgroundBar((current) =>
      current?.kind === "pending" ? null : current,
    );
  }

  // Actually starts resolving one item (chosen or deferred, doesn't
  // matter which — see the two call sites below) — appends its OWN
  // loading turn to the chat body right away (per explicit request: once
  // an item "begins," its progress belongs in the ordinary chat flow,
  // same shimmering status any other turn gets, with the floating bar
  // only stepping back in once the buyer scrolls away from it — see
  // itemBTurnVisible above), rather than staying invisible until it
  // resolves. `prevTurnCountRef` is bumped in lockstep with the append so
  // this never triggers the ordinary "new turn" auto-scroll (bottomRef's
  // own effect) — a buyer reading an earlier turn's own results should
  // never be yanked anywhere by this quietly starting underneath them.
  //
  // `displayQuery` is what shows as the buyer's OWN chat bubble above the
  // loading status — empty for an ordinary deferred item (nothing was
  // "said," it's a background job — see the query/imagePreview-gated
  // bubble render below), but the item's own label for handleItemPick's
  // call (the buyer DID just say this, via tapping its pick button, so it
  // reads naturally as their own message confirming the choice).
  function startItem(
    next: { item: BackgroundSearchItem; label: string },
    displayQuery: string,
  ) {
    const turnId = generateUUID();
    setTurns((prev) => [
      ...prev,
      createLoadingTurn(
        turnId,
        displayQuery,
        null,
        null,
        pickAvoiding(scanningVendorsPhrase(next.label), []),
      ),
    ]);
    prevTurnCountRef.current += 1;

    setBackgroundBar({
      kind: "working",
      turnId,
      text: pickAvoiding(scanningVendorsPhrase(next.label), []),
    });
    backgroundCycleRef.current = setInterval(() => {
      setBackgroundBar((current) => {
        if (current?.kind !== "working" || current.turnId !== turnId)
          return current;
        const text = pickAvoiding(scanningVendorsPhrase(next.label), [
          current.text,
        ]);
        updateTurn(turnId, { status: text });
        return { ...current, text };
      });
    }, 2500);

    void resolveBackgroundItem(next.item, next.label, turnId);
  }

  // Shifts the next entry off the queue and starts it (see startItem
  // above) — the ordinary deferred-item path, always with an empty
  // display query (nothing the buyer said, a background job).
  function startNextBackgroundItem() {
    backgroundStartScheduledRef.current = false;
    const next = pendingBackgroundQueueRef.current.shift();
    if (!next) return;
    startItem(next, "");
  }

  // The dual-intent item_pick clarification's own answer (see
  // ClarificationPrompt's onPickItem) — per explicit request (2026-08-20
  // redesign, replacing an earlier "product side always goes first"
  // convention): the buyer, not the app, decides which of the two named
  // needs gets resolved first. `chosen` starts immediately (via startItem,
  // same as any other item, just with its own label standing in as the
  // buyer's displayed message — they DID just say this, by tapping its
  // button); `deferred` is queued exactly like an ordinary background
  // item, picked up once `chosen`'s own flow (including a full
  // reach-out-offer exchange, if it has one) concludes.
  function handleItemPick(
    chosen: { item: BackgroundSearchItem; label: string },
    deferred: { item: BackgroundSearchItem; label: string },
  ) {
    clearBackgroundTimers();
    pendingBackgroundQueueRef.current = [deferred];
    startItem(chosen, chosen.label);
  }

  // Settles the floating bar once one deferred item's own fetch concludes
  // — shared by every branch of resolveBackgroundItem below. If another
  // item is still queued behind this one, the bar moves straight to
  // "queued" for THAT one (same unconditional-visibility state onFinal
  // sets up initially) and schedules it, rather than sitting on this
  // item's own "pending"/"resolved" state — otherwise a later queued item
  // starting right behind this one would never get its own turn to show.
  function settleBackgroundItem(
    turnId: string,
    kind: "pending" | "resolved",
    label: string,
  ) {
    lastConcludedLabelRef.current = label;
    const next = pendingBackgroundQueueRef.current[0];
    if (next) {
      setBackgroundBar({
        kind: "queued",
        text: pickAvoiding(
          initiatingBackgroundItemPhrase(label, next.label),
          [],
        ),
      });
      scheduleNextBackgroundItem();
      return;
    }
    setBackgroundBar({
      kind,
      turnId,
      text: pickAvoiding(
        kind === "pending"
          ? backgroundItemPendingPhrase(label)
          : backgroundItemResolvedPhrase(label),
        [],
      ),
    });
  }

  // Resolves one deferred item independently — a plain deterministic fetch
  // (no LLM, see /api/search/resolve-item's own comment), only ever called
  // once the item ahead of it (item A the first time, or whichever queued
  // item preceded it) has fully concluded (see scheduleNextBackgroundItem/
  // startNextBackgroundItem above) — never awaited by anything, a genuine
  // background job, per explicit request ("like how Claude works"). Updates
  // its OWN loading turn (already appended by startNextBackgroundItem) in
  // place, rather than appending a fresh one — that turn has been visible,
  // shimmering, in the chat body this whole time.
  async function resolveBackgroundItem(
    item: BackgroundSearchItem,
    label: string,
    turnId: string,
  ): Promise<void> {
    let outcome: SearchItemOutcome | null = null;
    let failedText: string | null = null;
    try {
      const res = await fetch("/api/search/resolve-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item,
          location: item.location,
          buyerLocation: buyerLocationRef.current ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        outcome?: SearchItemOutcome;
        error?: string;
      } | null;
      if (!res.ok || !data?.outcome) {
        throw new Error(data?.error ?? "Background check failed.");
      }
      outcome = data.outcome;
    } catch {
      failedText = "Couldn't finish checking that in the background.";
    }

    clearBackgroundTimers();

    if (failedText || !outcome) {
      updateTurn(turnId, {
        phase: "done",
        reply: failedText ?? "Couldn't finish checking that in the background.",
        toolCalled: true,
        products: [],
        stores: [],
        furtherStores: [],
        storesQuery: null,
        productsMatchTier: null,
        storesMatchTier: null,
        productsMatchQuality: undefined,
        storesMatchQuality: undefined,
        externalStoreSuggestions: [],
        buyerRequestOffered: false,
      });
      // A genuine failure still resolves this item's own lifecycle — no
      // further action the buyer can take on it, so this is "resolved" not
      // "pending", same as a normal empty result.
      settleBackgroundItem(turnId, "resolved", label);
      return;
    }

    if (outcome.status === "offer") {
      // Reuses the exact same buyerRequestOffered bubble/Yes-No pattern a
      // real server-driven offer already gets — clicking either button
      // goes through handleClarificationAnswer exactly like any other
      // clarification answer, which sends it as the buyer's next real
      // message; the model reads this turn's own `reply` text (now part
      // of `history`) and proceeds through the NORMAL createBuyerRequest
      // flow from there, completely unmodified.
      updateTurn(turnId, {
        phase: "done",
        reply: outcome.text,
        toolCalled: true,
        products: [],
        stores: [],
        furtherStores: [],
        storesQuery: null,
        productsMatchTier: null,
        storesMatchTier: null,
        productsMatchQuality: undefined,
        storesMatchQuality: undefined,
        externalStoreSuggestions: [],
        buyerRequestOffered: true,
        awaitingBuyerRequestReply: true,
      });
      // Needs the buyer's own Yes/No — see backgroundBar's own comment.
      settleBackgroundItem(turnId, "pending", label);
      return;
    }

    if (outcome.status === "products") {
      updateTurn(turnId, {
        phase: "done",
        reply: "Found a real match on Velte for that — take a look below.",
        toolCalled: true,
        products: outcome.products,
        stores: [],
        furtherStores: [],
        storesQuery: null,
        productsMatchTier: outcome.matchTier,
        storesMatchTier: null,
        productsMatchQuality: outcome.matchQuality,
        storesMatchQuality: undefined,
        externalStoreSuggestions: [],
        buyerRequestOffered: false,
      });
      settleBackgroundItem(turnId, "resolved", label);
      return;
    }

    if (outcome.status === "stores") {
      updateTurn(turnId, {
        phase: "done",
        reply: "Found a real match on Velte for that — take a look below.",
        toolCalled: true,
        products: [],
        stores: outcome.stores,
        furtherStores: outcome.furtherStores,
        storesQuery: outcome.storesQuery,
        productsMatchTier: null,
        storesMatchTier: outcome.matchTier,
        productsMatchQuality: undefined,
        storesMatchQuality: outcome.matchQuality,
        externalStoreSuggestions: [],
        buyerRequestOffered: false,
      });
      settleBackgroundItem(turnId, "resolved", label);
      return;
    }

    // outcome.status === "nothing" — resolveSearchItem always attempts the
    // cross-index check + Google Places before ever landing here, so this
    // still carries externalSuggestions whenever any exist; never a silent
    // dead end (see that file's own comment). Still "resolved", not
    // "pending" — there's nothing the buyer owes a reply to, just results
    // (possibly Google Places ones) to look at whenever they scroll down.
    updateTurn(turnId, {
      phase: "done",
      reply: outcome.text,
      toolCalled: true,
      products: [],
      stores: [],
      furtherStores: [],
      storesQuery: null,
      productsMatchTier: null,
      storesMatchTier: null,
      productsMatchQuality: undefined,
      storesMatchQuality: undefined,
      externalStoreSuggestions: outcome.externalSuggestions,
      buyerRequestOffered: false,
    });
    settleBackgroundItem(turnId, "resolved", label);
  }

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

  // Appends rather than replaces (unlike updateTurn's plain patch) — a
  // functional setTurns update so it's correct even if two "reply" events
  // land close together, without needing the caller to read current state
  // first (see onReply below).
  function appendInterimReply(id: string, text: string) {
    setTurns((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, interimReplies: [...t.interimReplies, text] } : t,
      ),
    );
  }

  // The actual /api/search call + all its event handlers, for a turn that
  // ALREADY EXISTS (appended by the caller — submitMessage below appends
  // one fresh, submitWithLocationGate reuses the one it already showed
  // while it was resolving location) — split out from submitMessage so
  // BOTH can share it. `turns` is read fresh at call time (not passed in),
  // same as it always was when this lived inline in submitMessage.
  async function runSearchIntoTurn(
    turnId: string,
    message: string,
    currentImageUrl: string | null,
  ): Promise<void> {
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
          // A structural signal, not left for the server to guess from the
          // text — see SearchHistoryTurn's own comment on the bug(s) this
          // fixes (a plain "yes," and separately the name reply after it,
          // weren't reliably recognized as continuing THIS specific
          // exchange).
          awaitingBuyerRequestReply: t.awaitingBuyerRequestReply,
        },
      ]);

    // Refreshes the loading status to match what THIS call is actually
    // about — the turn may already be showing something else (e.g.
    // submitWithLocationGate's own gettingLocationPhrase pick while it
    // was resolving silent geolocation) by the time this runs.
    updateTurn(turnId, {
      phase: "loading",
      status: currentImageUrl
        ? "Looking at your photo…"
        : "Understanding your request…",
    });

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
        onReply: (text) => {
          appendInterimReply(turnId, text);
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
            awaitingBuyerRequestReply: event.awaitingBuyerRequestReply,
            contextNote,
          });
          // A buyer who already has a verified session (a prior visit's
          // identity cookie still valid) skips the composer's own
          // identity-capture mode entirely — createBuyerRequest resolves
          // straight to a terminal status (`created`, sometimes
          // `no_match`/`error`) in THIS SAME stream event, most commonly
          // via the agreement short-circuit's own follow-up turn (the
          // name-ask's reply). Checked unconditionally, independent of
          // `event.backgroundItems` — the terminal status can land on a
          // LATER turn than the one that originally populated
          // `pendingBackgroundQueueRef` (offer → name-ask → this one).
          // concludeCurrentItemFlow handles both cases: advances the queue
          // if anything's left in it, otherwise clears a "pending" pill
          // that this exact answer just resolved.
          const offerAlreadyTerminal =
            event.buyerRequestOffer?.status === "created" ||
            event.buyerRequestOffer?.status === "no_match" ||
            event.buyerRequestOffer?.status === "error";
          if (offerAlreadyTerminal) concludeCurrentItemFlow();
          // The composer's own phone/OTP identity-capture mode (see
          // IdentityCapture's own comment) takes over the instant this
          // status arrives — `imageUrl` is read off THIS turn (the one
          // carrying the offer), never a later one, since the composer's
          // own `imageUrl` state may have already moved on to a fresh
          // photo by the time the buyer actually finishes verifying.
          if (event.buyerRequestOffer?.status === "needs_identity") {
            setIdentityCapture({
              offer: event.buyerRequestOffer,
              imageUrl: currentImageUrl,
              step: "phone",
              phone: "",
            });
            setIdentityValue("");
          }
          // The composer's own name-capture mode (see nameCapture's own
          // comment) — same trigger shape as identityCapture just above,
          // just keyed off the clarification kind instead of the offer
          // status, since the name-ask arrives as its own turn BEFORE any
          // buyerRequestOffer exists at all.
          if (event.clarification?.kind === "name") {
            setNameCapture({ question: event.clarification.question });
            setNameValue("");
          }
          // Generic handling for a turn that arrives with its own deferred
          // item(s) already queued — currently dormant in practice: a
          // genuine dual-intent turn no longer populates
          // event.backgroundItems on ITS OWN turn at all (2026-08-20
          // redesign — it hands both sides to the buyer as an "item_pick"
          // clarification instead, see handleItemPick, which populates
          // pendingBackgroundQueueRef directly once the buyer actually
          // picks one). Left in place as the generic "a turn already knows
          // about a deferred item" path — this turn's OWN flow is done;
          // the deferred item(s) are queued but does NOT start yet — see
          // pendingBackgroundQueueRef's own comment. If this turn itself
          // needs a reach-out offer (buyerRequestOffered true), the queue
          // waits for THAT to conclude (handleIdentitySubmit/
          // handleClarificationAnswer/the offerAlreadyTerminal check just
          // above all call concludeCurrentItemFlow once it does); otherwise
          // this turn is already fully concluded right now, so the
          // delayed start is scheduled immediately.
          if (event.backgroundItems.length > 0) {
            clearBackgroundTimers();
            const itemALabel = event.dualIntentItemALabel ?? "that";
            lastConcludedLabelRef.current = itemALabel;
            pendingBackgroundQueueRef.current = event.backgroundItems.map(
              (item) => ({ item, label: backgroundItemLabel(item) }),
            );
            const next = pendingBackgroundQueueRef.current[0];
            setBackgroundBar({
              kind: "queued",
              text: pickAvoiding(
                initiatingBackgroundItemPhrase(itemALabel, next.label),
                [],
              ),
            });
            if (!event.buyerRequestOffered) {
              scheduleNextBackgroundItem();
            }
          }
        },
        onError: (errorMessage) => {
          updateTurn(turnId, { phase: "done", error: errorMessage });
        },
      },
    );
  }

  // Shared by the main composer (handleSubmit, via submitWithLocationGate)
  // and a clarification answer (handleClarificationAnswer, via
  // ClarificationPrompt) — both are just "the buyer sent a message," the
  // only difference is where the text came from and whether an image rides
  // along. Callers are responsible for their own send-guard
  // (isSending/uploadingImage/hasPendingClarification) and for clearing
  // their own input state before calling this. Appends a fresh turn and
  // hands it straight to runSearchIntoTurn — the ordinary path, when
  // location is already resolved (or this isn't a genuinely new message,
  // e.g. answering a clarification) and there's nothing to show BEFORE the
  // turn itself.
  async function submitMessage(
    message: string,
    currentImageUrl: string | null,
    currentImagePreview: string | null,
  ): Promise<void> {
    const turnId = generateUUID();
    setTurns((prev) => [
      ...prev,
      createLoadingTurn(
        turnId,
        message,
        currentImagePreview,
        currentImageUrl,
        currentImageUrl
          ? "Looking at your photo…"
          : "Understanding your request…",
      ),
    ]);
    await runSearchIntoTurn(turnId, message, currentImageUrl);
  }

  // Silent best-effort attempt at the buyer's location — never shows a
  // prompt/spinner itself, only succeeds if permission was already granted
  // (an earlier visit, or the browser/OS remembers it), so it can resolve
  // near-instantly with no visible interruption. There's no native dialog to
  // wait for here (permission is already confirmed granted below before this
  // ever calls getCurrentPosition), but that does NOT mean the fix itself is
  // instant — a real GPS/network fix routinely takes longer than a few
  // seconds (cold GPS start, indoors, weak signal), and a too-short timeout
  // here just means a buyer who genuinely has location on gets asked anyway.
  // Found live: this used to be 4000ms with no maximumAge, which forced a
  // brand-new fresh fix on every single search and frequently timed out
  // before one arrived — silently falling through to the ask despite
  // permission being "granted", i.e. exactly the "always asks even with
  // geolocation on" bug. `maximumAge` lets the browser hand back a fix it
  // already has cached instead of always re-acquiring one — the buyer's
  // location barely moves between messages in one search session, so a
  // slightly stale cached fix is fine and typically resolves near-instantly.
  // `navigator.permissions` isn't universally supported (notably Safari) —
  // treated as "don't know," same as "not granted", rather than blocking on
  // a feature-detect that can't be relied on.
  const SILENT_GEOLOCATION_TIMEOUT_MS = 8000;
  const SILENT_GEOLOCATION_MAX_AGE_MS = 5 * 60 * 1000;
  async function trySilentGeolocation(): Promise<BuyerLocation | null> {
    if (typeof navigator === "undefined" || !navigator.geolocation) return null;
    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({
          name: "geolocation",
        });
        if (status.state !== "granted") return null;
      }
    } catch {
      return null;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        () => resolve(null),
        {
          timeout: SILENT_GEOLOCATION_TIMEOUT_MS,
          maximumAge: SILENT_GEOLOCATION_MAX_AGE_MS,
        },
      );
    });
  }

  // The location gate every genuinely NEW buyer message goes through before
  // submitMessage ever runs — per explicit request, location is checked
  // FIRST, before any search work begins, not left for the AI to notice
  // mid-search (see buyerLocationRef's own comment for the history here).
  // Deliberately NOT used by clarification-answer submissions
  // (handleClarificationAnswer/handleLocationShared call submitMessage
  // directly) — gating those too would re-trigger this on the buyer's own
  // "Shared my location"/"Search without it" replies, an infinite loop.
  //
  // Three paths, checked in order: if the buyer's OWN message already
  // names a place (messageNamesAPlace — found live: it used to ask even
  // then, only ever checking device geolocation, never the text itself),
  // there's nothing to ask for — proceed exactly as if location were
  // already resolved, THIS message only (doesn't set locationDeclinedRef,
  // so a later message with no place named still gets asked normally). If
  // geolocation is silently available (already granted), trySilentGeolocation
  // resolves it with zero visible interruption and the real search proceeds
  // immediately. Otherwise, this turns into a client-only clarification —
  // no /api/search call yet — reusing the exact same
  // ClarificationPrompt/LocationShareAction widget and
  // handleLocationShared/handleClarificationAnswer handlers a real
  // server-driven location clarification already uses. Once the buyer
  // answers, that existing mechanism takes over unmodified: the answer
  // becomes the next real submitMessage call, with this turn already in
  // `history`, so the model still sees the buyer's original need — same
  // "combine it with what they already said" behavior systemPrompt.ts
  // already documents for an in-conversation location clarification.
  //
  // Found live: this used to await trySilentGeolocation() BEFORE ever
  // appending anything — the buyer's own message didn't show up at all
  // until that resolved, which can take up to SILENT_GEOLOCATION_TIMEOUT_MS
  // (4s) on a slow/no GPS fix. A real, confusing delay with zero visible
  // feedback in the meantime. Now the turn appears INSTANTLY, same as any
  // other send, with an ordinary shimmering status line (gettingLocationPhrase,
  // same varied pool LocationShareAction's own explicit flow already uses)
  // while the silent check happens underneath it — exactly the same
  // pattern every other async step in this app already uses, just applied
  // to this one too instead of blocking on it silently.
  async function submitWithLocationGate(
    message: string,
    currentImageUrl: string | null,
    currentImagePreview: string | null,
  ): Promise<void> {
    if (
      buyerLocationRef.current ||
      locationDeclinedRef.current ||
      messageNamesAPlace(message)
    ) {
      await submitMessage(message, currentImageUrl, currentImagePreview);
      return;
    }

    const turnId = generateUUID();
    setTurns((prev) => [
      ...prev,
      createLoadingTurn(
        turnId,
        message,
        currentImagePreview,
        currentImageUrl,
        // Same varied-wording pool gettingLocationPhrase already provides
        // for LocationShareAction's own explicit "Share my location" flow
        // — reused here rather than a single static string, matching how
        // every other status line in this app works (see statusPhrases.ts).
        pickAvoiding(gettingLocationPhrase(), []),
      ),
    ]);

    const silentLocation = await trySilentGeolocation();
    if (silentLocation) {
      buyerLocationRef.current = silentLocation;
      await runSearchIntoTurn(turnId, message, currentImageUrl);
      return;
    }

    const askText = pickAvoiding(LOCATION_GATE_ASK_PHRASES, []);
    updateTurn(turnId, {
      phase: "done",
      status: "",
      reply: askText,
      clarification: { kind: "location", question: askText },
    });
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
      void submitWithLocationGate(q, null, null);
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
    await submitWithLocationGate(message, currentImageUrl, currentImagePreview);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The composer's own name-capture mode (see nameCapture's own comment)
    // hijacks the SAME form/submit button too, checked first — a name ask
    // always comes strictly before the phone/OTP step it leads into, so
    // the two never overlap in practice, but checking name first keeps the
    // ordering explicit rather than relying on that.
    if (nameCapture) {
      await handleNameSubmit();
      return;
    }
    // The composer's own identity-capture mode (see IdentityCapture's own
    // comment) hijacks the SAME form/submit button, not a separate one —
    // routed here instead of trySubmit while it's active.
    if (identityCapture) {
      await handleIdentitySubmit();
      return;
    }
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
  // text-only, see SearchHistoryTurn). Deliberately calls submitMessage
  // directly, not submitWithLocationGate — this text IS the buyer's answer
  // to a location (or other) clarification already showing; gating it too
  // would re-ask on the buyer's own "Search without sharing my location"
  // reply, an infinite loop.
  function handleClarificationAnswer(text: string) {
    // Marks the gate resolved (declined) whenever this is answering a
    // LOCATION clarification specifically — covers both a real
    // server-driven one (systemPrompt.ts's own rule) and
    // submitWithLocationGate's own client-only one, so submitWithLocationGate
    // never asks again this session either way.
    if (lastTurn?.clarification?.kind === "location") {
      locationDeclinedRef.current = true;
    }
    // A decline of item A's own reach-out offer is just as much a
    // conclusion as an actual created request — if a deferred item is
    // sitting queued on item A's flow to finish (see
    // pendingBackgroundQueueRef), this is what lets it finally start.
    // "No thanks, that's okay" is the buyerRequestOffered Yes/No pair's
    // own literal decline text (see the button below), never typed by the
    // buyer themselves. Only item A's OWN offer can still be pending
    // here — by design, the queue never even starts draining until item A
    // concludes, so there's never a second, competing offer in flight to
    // confuse this with.
    if (lastTurn?.buyerRequestOffered && text === "No thanks, that's okay") {
      concludeCurrentItemFlow();
    }
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

  // Appends a turn for one step of the identity-capture exchange (see
  // IdentityCapture's own comment) — `query` IS the buyer's own submitted
  // value (phone, then the code), rendered as an ordinary chat bubble same
  // as any other message, with `status` as the initial shimmering line.
  // Reuses createLoadingTurn wholesale — this is structurally identical to
  // any other turn, just never routed through /api/search.
  function appendIdentityTurn(query: string, status: string): string {
    const turnId = generateUUID();
    setTurns((prev) => [
      ...prev,
      createLoadingTurn(turnId, query, null, null, status),
    ]);
    return turnId;
  }

  // The composer's own submit handler while identityCapture is active (see
  // handleSubmit's own branch below) — phone and OTP go through the exact
  // same shape: echo the buyer's value as a real chat turn, narrate each
  // REST step via the same shimmering status line every other in-progress
  // moment in this app already uses, and land on a real terminal result.
  // Never routes through submitMessage/runSearchIntoTurn — none of this
  // involves the AI at all, it's the exact same three REST calls
  // BuyerPhoneVerifyForm used to make on its own (request-otp/verify-otp/
  // POST buyer-requests), just narrated as conversation instead of a
  // silent form.
  async function handleIdentitySubmit() {
    if (!identityCapture || identitySubmitting) return;
    const value = identityValue.trim();
    if (!value) return;

    if (identityCapture.step === "phone") {
      if (value.length < 10) {
        toast.error("Enter a valid phone number.");
        return;
      }
      setIdentityValue("");
      setIdentitySubmitting(true);
      const turnId = appendIdentityTurn(
        value,
        pickAvoiding(sendingOtpPhrase(), []),
      );
      try {
        await buyerApi.post("/api/buyer-auth/request-otp", { phone: value });
        updateTurn(turnId, {
          phase: "done",
          reply: `Code sent to ${value} — enter it below.`,
        });
        setIdentityCapture((cur) =>
          cur ? { ...cur, step: "otp", phone: value } : cur,
        );
        startResendCooldown();
      } catch (err) {
        updateTurn(turnId, {
          phase: "done",
          error: err instanceof Error ? err.message : "Couldn't send the code.",
        });
        // Stays on the phone step (identityCapture untouched) so the
        // buyer can just try again — the composer's still in phone mode.
      } finally {
        setIdentitySubmitting(false);
      }
      return;
    }

    // step === "otp"
    if (!/^\d{6}$/.test(value)) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setIdentityValue("");
    setIdentitySubmitting(true);
    const turnId = appendIdentityTurn(
      value,
      pickAvoiding(checkingOtpPhrase(), []),
    );
    try {
      const { buyer } = await buyerApi.post<{ buyer: Buyer }>(
        "/api/buyer-auth/verify-otp",
        { phone: identityCapture.phone, otp: value },
      );
      useBuyerStore.getState().setBuyer(buyer);
      // Same turn, still "loading" — the shimmer just switches to a new
      // line, per explicit request ("the status phrase should also
      // indicate that it is creating the request now before displaying
      // that the request has been created").
      updateTurn(turnId, { status: pickAvoiding(creatingRequestPhrase(), []) });
      const { offer } = identityCapture;
      const { created, request } = await buyerApi.post<{
        created: boolean;
        request: { id: string } | null;
      }>("/api/buyer-requests", {
        description: offer.description,
        name: offer.buyerName,
        imageUrl: identityCapture.imageUrl,
        ...(buyerLocationRef.current && { location: buyerLocationRef.current }),
      });
      if (!created || !request) {
        // Mirrors BuyerRequestOfferWidget's own (now-inert for this
        // specific path — see that file's own comment) selfResolvedNoMatch
        // behavior: no AI turn runs for this REST-only flow, so the
        // normal "no_match re-searches and reveals Google Places in the
        // same turn" behavior (systemPrompt.ts) has nothing to attach to
        // — this is that same reveal, done deterministically via the same
        // dedicated route, rendered through the turn's own ordinary
        // externalStoreSuggestions branch (ConversationTurnView) rather
        // than a separate widget.
        let externalStoreSuggestions: NearbyBusiness[] = [];
        try {
          const { externalSuggestions } = await buyerApi.post<{
            externalSuggestions: NearbyBusiness[];
          }>("/api/buyer-requests/nearby", {
            description: offer.description,
            ...(buyerLocationRef.current && {
              location: buyerLocationRef.current,
            }),
          });
          externalStoreSuggestions = externalSuggestions;
        } catch {
          // Best-effort — an empty list still resolves the turn cleanly.
        }
        updateTurn(turnId, {
          phase: "done",
          reply: pickAvoiding(
            noMatchRequestPhrase(externalStoreSuggestions.length > 0),
            [],
          ),
          externalStoreSuggestions,
        });
      } else {
        updateTurn(turnId, {
          phase: "done",
          reply:
            "I've reached out to a few businesses about this — if anyone's interested, they'll message you directly on WhatsApp. You'll also get an SMS confirming this went out.",
          buyerRequestOffer: {
            status: "created",
            requestId: request.id,
            description: offer.description,
          },
        });
      }
      concludeCurrentItemFlow();
      setIdentityCapture(null);
    } catch (err) {
      updateTurn(turnId, {
        phase: "done",
        error: err instanceof Error ? err.message : "Something went wrong.",
      });
      // Stays on the otp step so the buyer can retry the same code (or
      // request a fresh one — see the composer's own "Use a different
      // number"/resend affordance below).
    } finally {
      setIdentitySubmitting(false);
    }
  }

  // The OTP step's own "Resend code"/"Use a different number" affordances
  // — same two escape hatches BuyerPhoneVerifyForm used to offer, just
  // reachable from the composer now. Resend goes through the exact same
  // conversational shape as the real submit (a turn + shimmering status);
  // changing the number is a pure client-side reset — nothing server-side
  // has happened yet for a number that was never actually sent a code.
  async function handleResendOtp() {
    if (!identityCapture || identitySubmitting) return;
    const { phone } = identityCapture;
    setIdentitySubmitting(true);
    const turnId = appendIdentityTurn(
      "Resend the code",
      pickAvoiding(sendingOtpPhrase(), []),
    );
    try {
      await buyerApi.post("/api/buyer-auth/request-otp", { phone });
      updateTurn(turnId, {
        phase: "done",
        reply: `Code sent to ${phone} — enter it below.`,
      });
      startResendCooldown();
    } catch (err) {
      updateTurn(turnId, {
        phase: "done",
        error: err instanceof Error ? err.message : "Couldn't resend the code.",
      });
    } finally {
      setIdentitySubmitting(false);
    }
  }
  function handleChangeNumber() {
    setIdentityCapture((cur) =>
      cur ? { ...cur, step: "phone", phone: "" } : cur,
    );
    setIdentityValue("");
    // A different number hasn't been sent anything yet — the cooldown
    // belongs to the OLD number's in-flight code, not this one.
    if (resendCooldownIntervalRef.current) {
      clearInterval(resendCooldownIntervalRef.current);
      resendCooldownIntervalRef.current = null;
    }
    setResendSecondsLeft(0);
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

      {nameCapture ? (
        // The composer's own name-capture mode (see nameCapture's own
        // comment) — same single-line-swap treatment as identityCapture
        // just below, just one value with no multi-step progression.
        // Reverts to the ordinary textarea the instant it's submitted
        // (handleNameSubmit clears nameCapture before sending it on).
        <div className="flex flex-col bg-white rounded-[28px] border border-orange-200 shadow-sm focus-within:border-orange-300 focus-within:shadow-md transition-shadow px-5 py-3.5">
          <label className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
            <UserIcon size={12} className="text-orange-400 shrink-0" />
            What&apos;s your name?
          </label>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              disabled={nameSubmitting}
              placeholder="Your name"
              className="flex-1 min-w-0 h-10 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={nameSubmitting || !nameValue.trim()}
              title="Continue"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white transition-colors"
            >
              {nameSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowUp size={18} />
              )}
            </button>
          </div>
        </div>
      ) : identityCapture ? (
        // The composer's own phone/OTP identity-capture mode (see
        // IdentityCapture's own comment) — the free-text textarea below is
        // swapped for a dedicated single-line input for exactly this one
        // value, styled the same rounded-pill container so it still reads
        // as the SAME composer, not a different UI dropped in. Reverts to
        // the ordinary textarea the moment identityCapture clears
        // (handleIdentitySubmit, on a real terminal result).
        <div className="flex flex-col bg-white rounded-[28px] border border-orange-200 shadow-sm focus-within:border-orange-300 focus-within:shadow-md transition-shadow px-5 py-3.5">
          <label className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
            {identityCapture.step === "phone" ? (
              <>
                <PhoneIcon size={12} className="text-orange-400 shrink-0" />
                What&apos;s your WhatsApp number? That&apos;s how a vendor will
                reach you.
              </>
            ) : (
              <>
                <ShieldCheckIcon
                  size={12}
                  className="text-orange-400 shrink-0"
                />
                Code sent to {identityCapture.phone} — enter it below
              </>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={identityValue}
              onChange={(e) =>
                setIdentityValue(
                  identityCapture.step === "otp"
                    ? e.target.value.replace(/\D/g, "").slice(0, 6)
                    : e.target.value,
                )
              }
              disabled={identitySubmitting}
              placeholder={
                identityCapture.step === "phone" ? "080X XXX XXXX" : "123456"
              }
              inputMode={identityCapture.step === "phone" ? "tel" : "numeric"}
              className={cn(
                "flex-1 min-w-0 h-10 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400 disabled:opacity-50",
                identityCapture.step === "otp" && "text-center tracking-widest",
              )}
            />
            <button
              type="submit"
              disabled={identitySubmitting || !identityValue.trim()}
              title={identityCapture.step === "phone" ? "Continue" : "Verify"}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white transition-colors"
            >
              {identitySubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowUp size={18} />
              )}
            </button>
          </div>
          {identityCapture.step === "otp" && (
            <div className="flex items-center gap-3 mt-2.5">
              <button
                type="button"
                onClick={() => void handleResendOtp()}
                disabled={identitySubmitting || resendSecondsLeft > 0}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50 cursor-pointer"
              >
                {resendSecondsLeft > 0
                  ? `Resend code in ${resendSecondsLeft}s`
                  : "Resend code"}
              </button>
              <button
                type="button"
                onClick={handleChangeNumber}
                disabled={identitySubmitting}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 cursor-pointer"
              >
                Use a different number
              </button>
            </div>
          )}
        </div>
      ) : (
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
      )}
    </form>
  );

  return (
    // `h-full`, not `h-dvh` — this is no longer the whole screen, just the
    // content column beside chat/layout.tsx's own sidebar (that layout owns
    // the actual viewport-height boundary now; ChatHeader replaced the
    // <header> that used to live here). See chat/layout.tsx's own comment.
    <div className="h-full bg-white flex flex-col overflow-hidden relative">
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
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-6"
          >
            <div className="max-w-3xl lg:max-w-4xl mx-auto space-y-8">
              {turns.map((turn, i) => (
                // Wrapper div only exists to give registerTurnEl a real DOM
                // node per turn (see turnElRef's own comment) — a plain
                // block element, so it doesn't disturb the space-y-8
                // rhythm between turns (each wrapper is just one more
                // sibling in that flow, same as ConversationTurnView's own
                // root div was on its own before this).
                <div key={turn.id} ref={(el) => registerTurnEl(turn.id, el)}>
                  <ConversationTurnView
                    turn={turn}
                    isLatest={i === turns.length - 1}
                    onAnswerClarification={handleClarificationAnswer}
                    onLocationShared={handleLocationShared}
                    onPickItem={handleItemPick}
                    expandedServicesVendorId={expandedServicesVendorId}
                    onToggleServices={toggleServices}
                  />
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="shrink-0 px-5 sm:px-8 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="max-w-3xl lg:max-w-4xl mx-auto">
              {/* The deferred-item flow's own indicator — docked directly
                  above the composer, with a margin separating the two
                  (per explicit request, replacing an earlier top-anchored
                  version). Carries Velte's own avatar so it reads as
                  Velte narrating, the same voice as every other status
                  line and reply in this thread, not a bare status chip.
                  "queued" always shows (there's no turn of its own yet to
                  check on-screen-ness against — see backgroundBar's own
                  comment); "working"/"pending" only show while their own
                  turn (itemBTurnIdToWatch) is off screen — per explicit
                  request, this is a "you're missing something" flag, not
                  a persistent banner, so it has nothing left to say once
                  the buyer can already see that turn. "resolved" NEVER
                  shows here at all (2026-08-20, per explicit request) —
                  once a deferred item is fully done with nothing left
                  needing the buyer's action, there's nothing left to flag
                  either; the buyer discovers the results naturally by
                  scrolling, same as any other completed turn. */}
              <AnimatePresence>
                {backgroundBar &&
                  backgroundBar.kind !== "resolved" &&
                  (backgroundBar.kind === "queued" || !itemBTurnVisible) && (
                    <motion.div
                      initial={{ y: 16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 16, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="mb-3"
                    >
                      <div
                        onClick={
                          backgroundBar.kind !== "queued"
                            ? () => scrollToTurn(backgroundBar.turnId)
                            : undefined
                        }
                        onKeyDown={
                          backgroundBar.kind !== "queued"
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  scrollToTurn(backgroundBar.turnId);
                                }
                              }
                            : undefined
                        }
                        role={
                          backgroundBar.kind !== "queued" ? "button" : undefined
                        }
                        tabIndex={
                          backgroundBar.kind !== "queued" ? 0 : undefined
                        }
                        className={cn(
                          "max-w-lg mx-auto bg-white/95 backdrop-blur-md rounded-full border-2 border-gray-100 shadow-lg shadow-gray-400/15 pl-2 pr-5 h-12 flex items-center gap-2.5",
                          backgroundBar.kind !== "queued" &&
                            "cursor-pointer hover:bg-white hover:border-orange-200 transition-colors",
                        )}
                      >
                        <img
                          src="/velte_ai_assistant.png"
                          alt="Velte"
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        {backgroundBar.kind === "queued" ||
                        backgroundBar.kind === "working" ? (
                          <span className="status-shimmer truncate text-sm font-medium min-w-0">
                            {backgroundBar.text}
                          </span>
                        ) : (
                          <>
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                backgroundBar.kind === "pending"
                                  ? "bg-orange-500 animate-pulse"
                                  : "bg-emerald-500",
                              )}
                            />
                            <span className="truncate text-sm font-medium min-w-0 text-[#023337]">
                              {backgroundBar.text}
                            </span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>
              {inputForm}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
