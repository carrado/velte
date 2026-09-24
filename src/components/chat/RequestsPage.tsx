"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";

import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  MessageCircleIcon,
  PackageIcon,
  SearchIcon,
  SparklesIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons/hero";
// The "Buyer request" empty state's own illustration stays on the original
// duotone set, per explicit request.
import { ClipboardListIllustration } from "@/components/icons";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { useNavigation } from "@/components/chat/ChatNavigationProgressContext";
import { Avatar } from "@/components/Avatar";
import { fetchMyRequests } from "@/services/buyerRequests";
import { useBuyerStore } from "@/store/buyerStore";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { compareQuotes, leadTimeLabel } from "@/lib/quoteCompare";
import { buildChatLink } from "@/lib/chatLink";
import { timeLeft, windowElapsed } from "@/lib/requestWindow";
import { useNow } from "@/hooks/useNow";
import type {
  BuyerRequestResponder,
  BuyerRequestSectionId,
  BuyerRequestTone,
  MyBuyerRequest,
} from "@/types/buyerRequest";
import type { IconComponent } from "@/types/common";

// "Your requests" — the buyer's own view of every Buyer Request they have
// sent out (2026-08-30). The answer to the one question the chat cannot
// answer once the conversation scrolls away: did anything come of it?
//
// A request is never created from this page — that only ever happens inside a
// conversation, after a search genuinely found nothing and the buyer agreed
// to let Velte reach out (see systemPrompt.ts, which forbids
// createBuyerRequest in any other situation). So this page reports, and its
// one real action is messaging a business that answered.
//
// Buyer session ONLY: a request belongs to the Buyer document that created
// it, and a vendor's own view of the requests they were matched to is a
// different page entirely (/{id}/buyer-requests).
//
// Redesigned 2026-09-24 (explicit request, "a more rich UI"): sections by
// what the buyer needs to do rather than filter tabs, a progress tracker per
// request, and offers as cards — price against the buyer's own budget, a
// price-range strip when there's more than one quote. Also corrected the
// copy: since 2026-09-03 businesses never receive the buyer's number (see
// withoutBuyerPhone in velte-backend), so nobody "will message you" — the
// buyer taps Message, and that is the moment the lead is billed.

function place(area: string | null, state: string | null): string | null {
  // Vendors often type the state into their area too ("Ifite Anambra").
  if (area && state && area.toLowerCase().includes(state.toLowerCase())) {
    return area;
  }
  return [area, state].filter(Boolean).join(", ") || null;
}

// ── Status ─────────────────────────────────────────────────────────────────
// Derived, not stored: a request stays `active` while vendors accept, and
// that acceptance is the whole point — it must never read as "waiting".
function toneOf(request: MyBuyerRequest): BuyerRequestTone {
  if (request.status === "fulfilled") return "contacted";
  if (request.status !== "active") return "closed";
  return request.acceptedCount > 0 ? "offers" : "open";
}

function sectionOf(request: MyBuyerRequest): BuyerRequestSectionId {
  const tone = toneOf(request);
  if (tone === "offers") return "offers";
  if (tone === "open") return "waiting";
  return "past";
}

const TONE_STYLES: Record<BuyerRequestTone, string> = {
  // The one state that needs the buyer — the strongest treatment.
  offers: "border-orange-500 bg-orange-500 text-white",
  open: "border-orange-200 bg-orange-50 text-orange-700",
  contacted: "border-gray-200 bg-gray-50 text-ink",
  closed: "border-gray-200 bg-gray-50 text-gray-500",
};

function statusLabel(request: MyBuyerRequest, now: number): string {
  switch (toneOf(request)) {
    case "offers":
      return request.acceptedCount === 1
        ? "1 offer"
        : `${request.acceptedCount} offers`;
    case "open":
      return `Open · ${timeLeft(request.expiresAt, now)}`;
    case "contacted":
      return "Contacted";
    default:
      return request.status === "cancelled" ? "Cancelled" : "Closed";
  }
}

function StatusPill({
  request,
  now,
}: {
  request: MyBuyerRequest;
  now: number;
}) {
  const tone = toneOf(request);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        TONE_STYLES[tone],
      )}
    >
      {tone === "contacted" ? (
        <CheckIcon size={11} />
      ) : (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "offers" && "bg-white",
            tone === "open" && "animate-pulse bg-orange-500",
            tone === "closed" && "bg-gray-300",
          )}
        />
      )}
      {statusLabel(request, now)}
    </span>
  );
}

/** How much of the request itself to quote back in the WhatsApp prefill.
 *  /api/chat truncates the whole message at 700 characters, so a long
 *  description left whole would eat the quote and the question that follow it
 *  — the two parts the vendor actually needs. Trimmed here instead, where we
 *  know which part is expendable. */
const PREFILL_DESCRIPTION_MAX = 240;

/** The prefill. Composed at the call site rather than in the route, like every
 *  other chat CTA: each surface words it differently, and this one has to
 *  remind a vendor which request they answered and what they said it would
 *  cost — they may have accepted a dozen, hours ago. */
function contactMessage(
  responder: BuyerRequestResponder,
  description: string,
): string {
  const need =
    description.length > PREFILL_DESCRIPTION_MAX
      ? `${description.slice(0, PREFILL_DESCRIPTION_MAX).trimEnd()}…`
      : description;
  const lead = leadTimeLabel(responder.leadTimeDays);
  const quoted =
    responder.priceKobo != null
      ? ` You quoted ${formatNaira(responder.priceKobo)}${lead ? ` (${lead})` : ""}.`
      : "";
  return `Hi ${responder.name}, I posted a request on Velte for: ${need}.${quoted} Is that still available?`;
}

/** A quote read against the buyer's own budget — plain arithmetic on two
 *  numbers both sides already stated, never an opinion. Null without both. */
function budgetDelta(
  priceKobo: number | null,
  budgetKobo: number | null,
): { label: string; over: boolean } | null {
  if (priceKobo == null || budgetKobo == null) return null;
  const diff = priceKobo - budgetKobo;
  if (diff === 0) return { label: "Matches your budget", over: false };
  return diff < 0
    ? { label: `${formatNaira(-diff)} under budget`, over: false }
    : { label: `${formatNaira(diff)} over budget`, over: true };
}

// ── Progress ───────────────────────────────────────────────────────────────
// The request's journey, drawn: sent → offers → you message one. Each step is
// a fact the page already has, so nothing here is guessed at.
function ProgressTracker({
  request,
  now,
}: {
  request: MyBuyerRequest;
  now: number;
}) {
  const tone = toneOf(request);
  const steps = [
    {
      label: "Sent",
      detail:
        request.matchedVendorCount === 1
          ? "to 1 business"
          : `to ${request.matchedVendorCount} businesses`,
      done: true,
    },
    {
      label: "Offers",
      detail:
        request.acceptedCount > 0
          ? `${request.acceptedCount} received`
          : "waiting",
      done: request.acceptedCount > 0,
    },
    {
      label: "You message one",
      detail: tone === "contacted" ? "done" : "your move",
      done: tone === "contacted",
    },
  ];
  // The first step not yet done is the live one.
  const current = steps.findIndex((s) => !s.done);

  // How much of this request's own window has run — from its two stored
  // timestamps rather than a hardcoded 48h, so changing
  // BUYER_REQUEST_EXPIRY_HOURS in the backend cannot quietly make this lie.
  const elapsed = windowElapsed(request.createdAt, request.expiresAt, now);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-3">
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((step, i) => (
          <li key={step.label} className="relative min-w-0">
            {/* The connector to the next step — filled once this one is done. */}
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-6 right-0 top-2.5 h-0.5 rounded-full",
                  step.done ? "bg-orange-400" : "bg-gray-200",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2",
                step.done
                  ? "border-orange-500 bg-orange-500 text-white"
                  : i === current
                    ? "border-orange-400 bg-surface"
                    : "border-gray-200 bg-surface",
              )}
            >
              {step.done ? (
                <CheckIcon size={11} />
              ) : i === current ? (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
              ) : null}
            </span>
            <p
              className={cn(
                "mt-1.5 truncate text-[12px] font-semibold",
                step.done || i === current ? "text-ink" : "text-gray-400",
              )}
            >
              {step.label}
            </p>
            <p className="truncate text-[11px] text-gray-400">{step.detail}</p>
          </li>
        ))}
      </ol>

      {/* The window — only while it is actually running. */}
      {request.status === "active" && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="inline-flex items-center gap-1">
              <ClockIcon size={11} />
              Open to businesses
            </span>
            <span className="font-medium text-gray-500">
              {timeLeft(request.expiresAt, now)}
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-orange-400 transition-[width] duration-500"
              style={{ width: `${Math.round(elapsed * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Price range ────────────────────────────────────────────────────────────
// Every quote as a dot on one line, with the buyer's budget marked — "where
// do these sit against what I said I'd pay" in one glance. Only with two or
// more quotes: one price is a number, not a range.
function QuoteRange({
  prices,
  budgetKobo,
}: {
  prices: number[];
  budgetKobo: number | null;
}) {
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  // The budget widens the scale when it falls outside the quotes, so its
  // marker is always on the line rather than clipped off one end.
  const lo = budgetKobo != null ? Math.min(lowest, budgetKobo) : lowest;
  const hi = budgetKobo != null ? Math.max(highest, budgetKobo) : highest;
  const pos = (v: number) => (hi > lo ? ((v - lo) / (hi - lo)) * 100 : 50);

  return (
    <div className="rounded-xl border border-gray-100 bg-surface px-4 pb-3 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold text-ink">
          Offers from {formatNaira(lowest)} to {formatNaira(highest)}
        </p>
        {budgetKobo != null && (
          <p className="shrink-0 text-[11px] text-gray-400">
            Budget {formatNaira(budgetKobo)}
          </p>
        )}
      </div>
      <div className="relative mx-1.5 mt-4 mb-1 h-1.5 rounded-full bg-gray-100">
        {budgetKobo != null && (
          <span
            aria-hidden
            title={`Your budget: ${formatNaira(budgetKobo)}`}
            className="absolute -top-2 h-5.5 w-0.5 -translate-x-1/2 rounded-full bg-gray-400"
            style={{ left: `${pos(budgetKobo)}%` }}
          />
        )}
        {prices.map((price, i) => (
          <span
            key={`${price}-${i}`}
            aria-hidden
            title={formatNaira(price)}
            className={cn(
              "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface",
              price === lowest ? "bg-orange-600" : "bg-orange-300",
            )}
            style={{ left: `${pos(price)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── One offer ──────────────────────────────────────────────────────────────
// A vendor who ACCEPTED. Since 2026-09-03 accepting is free and releases
// nothing: they stated a price and are waiting to be picked, and the BUYER is
// the one who opens the conversation — so Message is this card's primary
// action, not a courtesy.
//
// Message goes through /api/chat — the same route every other buyer-facing
// WhatsApp CTA already uses — which resolves the vendor's number server-side
// and bills the lead on the journey. That is precisely what lets the fee be
// charged on CONTACT instead of on accept: the click passes through a route
// Velte controls, so the connection is countable. A plain wa.me href would be
// unbillable, and would put the number in the DOM besides.
function OfferCard({
  responder,
  request,
  now,
  badge,
  isBestPick,
}: {
  responder: BuyerRequestResponder;
  request: MyBuyerRequest;
  now: number;
  /** "Cheapest" / "Fastest" / null — set by the comparison in RequestCard,
   *  never derived here: one card cannot know what the others cost. */
  badge: string | null;
  isBestPick: boolean;
}) {
  const where = place(responder.area, responder.state);
  const lead = leadTimeLabel(responder.leadTimeDays);
  const delta = budgetDelta(responder.priceKobo, request.budgetKobo);
  const chatHref = buildChatLink({
    vendorId: responder.vendorId,
    source: "buyer_request",
    // Keys the lead to THIS request, so the backend bills once per
    // (request, vendor) rather than once per click.
    requestId: request.id,
    message: contactMessage(responder, request.description),
  });

  return (
    <li
      className={cn(
        "relative flex flex-col rounded-2xl border bg-surface p-4 transition-shadow hover:shadow-md",
        isBestPick
          ? "border-orange-300 ring-2 ring-orange-100"
          : "border-gray-100",
      )}
    >
      {isBestPick && (
        <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          <SparklesIcon size={10} />
          Best pick
        </span>
      )}

      <div className="flex items-center gap-3">
        <Avatar
          src={responder.avatar}
          label={responder.name.trim().charAt(0).toUpperCase()}
          className="h-10 w-10"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {responder.name}
          </p>
          <p className="flex items-center gap-1 truncate text-[11px] text-gray-400">
            {where && (
              <>
                <MapPinIcon size={11} className="shrink-0" />
                <span className="truncate">{where}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span className="shrink-0">
              {timeAgo(responder.respondedAt, now)}
            </span>
          </p>
        </div>
        {badge && (
          <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
            {badge}
          </span>
        )}
      </div>

      {/* The quote, or the honest absence of one. A vendor who accepted
          without naming a price is not shown as worse than one who did —
          they are shown as unanswered, with the thing to do about it. */}
      <div className="mt-4">
        {responder.priceKobo != null ? (
          <p className="text-2xl font-bold tracking-tight text-ink">
            {formatNaira(responder.priceKobo)}
          </p>
        ) : (
          <p className="text-sm font-medium text-gray-500">
            No price given — ask them
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {lead && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              <ClockIcon size={11} />
              {lead}
            </span>
          )}
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                delta.over
                  ? "bg-red-50 text-red-600"
                  : "bg-orange-50 text-orange-700",
              )}
            >
              <WalletIcon size={11} />
              {delta.label}
            </span>
          )}
        </div>
      </div>

      {responder.note && (
        <p className="mt-3 border-l-2 border-orange-200 pl-2.5 text-[12px] italic leading-relaxed text-gray-600">
          &ldquo;{responder.note}&rdquo;
        </p>
      )}

      <div className="mt-auto flex items-center gap-2 pt-4">
        {chatHref && (
          <a
            href={chatHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Message ${responder.name} on WhatsApp`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <MessageCircleIcon size={15} />
            Message
          </a>
        )}
        {/* No store row yet means no link — one is created lazily on the
            vendor's first dashboard visit. Message never depends on it. */}
        {responder.storeHandle && (
          <Link
            href={`/store/${responder.storeHandle}`}
            aria-label={`View ${responder.name}'s store`}
            title="View store"
            className="flex shrink-0 items-center gap-1 rounded-xl border border-gray-200 px-3 py-2.5 text-gray-500 transition-colors hover:border-orange-200 hover:text-orange-600"
          >
            <StoreIcon size={15} />
            <ExternalLinkIcon size={11} />
          </Link>
        )}
      </div>
    </li>
  );
}

function RequestCard({
  request,
  now,
  index,
}: {
  request: MyBuyerRequest;
  now: number;
  /** Position in its section — staggers the entrance a touch. */
  index: number;
}) {
  const tone = toneOf(request);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { navigate } = useNavigation();

  // The comparison (2026-09-03) — deterministic, no model, see
  // lib/quoteCompare.ts. Computed here rather than per card because every
  // verdict is RELATIVE: which quote is cheapest is not a fact about any one.
  const comparison = useMemo(
    () => compareQuotes(request.responders),
    [request.responders],
  );

  // Priced offers first, cheapest first, then everyone who accepted without
  // naming terms — the comparison's own order, which keeps the badges
  // pointing at the right cards.
  const ordered = useMemo(
    () => [...comparison.quoted, ...comparison.unquoted],
    [comparison],
  );

  const badges = useMemo(() => {
    const map = new Map<string, string>();
    // The recommendation gets its own "Best pick" treatment on the card, so
    // it's skipped here — two labels on one card is noise.
    const best = comparison.recommendation?.responder.vendorId;
    if (comparison.cheapest && comparison.cheapest.vendorId !== best) {
      map.set(comparison.cheapest.vendorId, "Cheapest");
    }
    if (comparison.fastest && comparison.fastest.vendorId !== best) {
      map.set(comparison.fastest.vendorId, "Fastest");
    }
    return map;
  }, [comparison]);

  const visible = showAll ? ordered : ordered.slice(0, 3);
  const hidden = ordered.length - visible.length;
  const longDescription = request.description.length > 160;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.05 }}
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface shadow-sm",
        tone === "offers" ? "border-orange-200" : "border-gray-100",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          {request.imageUrl ? (
            <a
              href={request.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the photo you sent"
              className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50"
            >
              <img
                src={request.imageUrl}
                alt="What you asked for"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </a>
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <PackageIcon size={26} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p
                className={cn(
                  "min-w-0 text-[15px] font-medium leading-snug text-ink",
                  !expanded && "line-clamp-2",
                )}
              >
                {request.description}
              </p>
              <StatusPill request={request} now={now} />
            </div>
            {longDescription && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-0.5 cursor-pointer text-[12px] font-medium text-orange-600 hover:text-orange-700"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  request.budgetKobo != null
                    ? "bg-orange-50 text-orange-700"
                    : "bg-gray-100 text-gray-500",
                )}
              >
                <WalletIcon size={11} />
                {request.budgetKobo != null
                  ? `Budget ${formatNaira(request.budgetKobo)}`
                  : "No budget given"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                <ClockIcon size={11} />
                Sent {timeAgo(request.createdAt, now)}
              </span>
            </div>
          </div>
        </div>

        {/* The tracker is for a request still in motion — or finished by the
            buyer. A lapsed one gets a plain closing line below instead. */}
        {tone !== "closed" && (
          <div className="mt-4">
            <ProgressTracker request={request} now={now} />
          </div>
        )}
      </div>

      {/* What came back. Three states, each with something to say — a blank
          space under an open request is exactly where a buyer decides the
          feature does not work. */}
      {request.responders.length > 0 ? (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50/60 p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {comparison.quoted.length > 1 ? "Compare offers" : "Who answered"}
          </p>

          {comparison.quoted.length > 1 && (
            <QuoteRange
              prices={comparison.quoted.map((r) => r.priceKobo)}
              budgetKobo={request.budgetKobo}
            />
          )}

          {/* The verdict, with the sentence that justifies it. Never a bare
              "best overall": every recommendation quoteCompare returns
              carries its own reason, built from the same numbers on the
              cards below, so a buyer can check it rather than trust it. */}
          {comparison.recommendation && (
            <div className="flex items-start gap-2.5 rounded-xl border border-orange-100 bg-orange-50/70 px-3.5 py-2.5">
              <SparklesIcon
                size={15}
                className="mt-0.5 shrink-0 text-orange-500"
              />
              <p className="text-[12px] leading-relaxed text-gray-600">
                <span className="font-semibold text-ink">
                  Best pick: {comparison.recommendation.responder.name}.
                </span>{" "}
                {comparison.recommendation.reason}
              </p>
            </div>
          )}

          <ul className="grid gap-3 pt-1 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((responder) => (
              <OfferCard
                key={responder.vendorId}
                responder={responder}
                request={request}
                now={now}
                badge={badges.get(responder.vendorId) ?? null}
                isBestPick={
                  comparison.recommendation?.responder.vendorId ===
                  responder.vendorId
                }
              />
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700"
            >
              <ChevronDownIcon size={13} />
              Show {hidden} more
            </button>
          )}
          <p className="text-[11px] leading-relaxed text-gray-400">
            Businesses don&apos;t see your number. Tap Message to start the chat
            on WhatsApp with the one you choose.
          </p>
        </div>
      ) : request.status === "active" ? (
        <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3.5 sm:px-5">
          <span className="flex shrink-0 gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </span>
          <p className="text-xs leading-relaxed text-gray-500">
            Waiting on businesses. We&apos;ll text and email you the moment one
            sends an offer — no need to keep this page open.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-3.5 sm:px-5">
          <p className="text-xs text-gray-500">
            No business picked this one up before it closed.
          </p>
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50"
          >
            <SearchIcon size={12} />
            Search again
          </button>
        </div>
      )}
    </motion.article>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: IconComponent;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-surface px-3.5 py-3 sm:px-4">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          highlight
            ? "bg-orange-500 text-white"
            : "bg-orange-50 text-orange-600",
        )}
      >
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none text-ink">{value}</p>
        <p className="mt-1 truncate text-[11px] font-medium text-gray-400">
          {label}
        </p>
      </div>
    </div>
  );
}

const SECTIONS: {
  id: BuyerRequestSectionId;
  title: string;
  hint: string;
}[] = [
  {
    id: "offers",
    title: "Offers waiting",
    hint: "Businesses answered — pick one and message them.",
  },
  {
    id: "waiting",
    title: "Waiting for businesses",
    hint: "Still open. Offers land here as they come in.",
  },
  {
    id: "past",
    title: "Past requests",
    hint: "Closed, or already contacted.",
  },
];

/** Past requests shown before "Show all" — the history is reference, not
 *  the reason someone opens this page. */
const PAST_PREVIEW = 3;

export function RequestsPage() {
  const buyer = useBuyerStore((s) => s.buyer);
  const now = useNow(60_000);
  const { navigate } = useNavigation();
  const [showAllPast, setShowAllPast] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["buyer", "requests"],
    queryFn: fetchMyRequests,
    // The endpoint answers an empty list for an anonymous caller, so asking
    // without a session would be a wasted round trip — same gate the
    // conversation sidebar's own list query uses.
    enabled: Boolean(buyer),
    staleTime: 30_000,
  });

  const requests = useMemo(() => data?.requests ?? [], [data]);

  const stats = useMemo(
    () => ({
      open: requests.filter((r) => r.status === "active").length,
      reached: requests.reduce((sum, r) => sum + r.matchedVendorCount, 0),
      offers: requests.reduce((sum, r) => sum + r.acceptedCount, 0),
    }),
    [requests],
  );

  // Grouped by what the buyer has to do. Offers are ordered by the newest
  // answer — the freshest reply is the one most likely unread.
  const grouped = useMemo(() => {
    const out: Record<BuyerRequestSectionId, MyBuyerRequest[]> = {
      offers: [],
      waiting: [],
      past: [],
    };
    for (const request of requests) out[sectionOf(request)].push(request);
    const answeredAt = (r: MyBuyerRequest) =>
      new Date(r.lastResponseAt ?? r.createdAt).getTime();
    out.offers.sort((a, b) => answeredAt(b) - answeredAt(a));
    return out;
  }, [requests]);

  if (!buyer) {
    return (
      // The chat shell (chat/layout.tsx) is `overflow-hidden` and hands its
      // children a fixed-height box — SearchHome scrolls its own thread
      // inside it. A page under that shell that doesn't own a scroller of
      // its own simply gets clipped at the fold, so every branch here
      // provides one.
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <ClipboardListIllustration size={64} className="mx-auto" />
          <h1 className="mt-4 text-lg font-bold text-ink">
            Sign in to see your requests
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            When Velte can&apos;t find something, it reaches out to businesses
            on your behalf. This is where you see who answered.
          </p>
          <div className="mt-6 flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Full width, not centered (2026-09-12, explicit request) — this and
          Notifications are the two pages reached from the sidebar menu
          rather than the narrow chat thread, so there's no reason to cap
          them to the thread's own reading width. */}
      <div className="px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Your requests
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              What Velte asked businesses on your behalf, and who came back.
            </p>
          </div>
          {requests.length > 0 && (
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              <SearchIcon size={14} />
              New search
            </button>
          )}
        </header>

        {isLoading && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
                />
              ))}
            </div>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-gray-100 bg-surface p-6 text-center">
            <p className="text-sm text-gray-500">
              Couldn&apos;t load your requests just now.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 cursor-pointer text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && requests.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-surface p-8 text-center sm:p-10">
            <ClipboardListIllustration size={64} className="mx-auto" />
            <p className="mt-4 text-base font-semibold text-ink">
              You haven&apos;t sent any requests yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">
              You don&apos;t make one from here. Search for what you need — if
              no business on Velte has it, Velte offers to reach out to the ones
              who might, and whatever comes back lands on this page.
            </p>
            <ol className="mx-auto mt-6 grid max-w-md gap-2 text-left sm:grid-cols-3">
              {[
                { icon: SearchIcon, text: "Search for it" },
                { icon: UsersIcon, text: "Velte asks businesses" },
                { icon: TagIcon, text: "Offers show up here" },
              ].map(({ icon: Icon, text }, i) => (
                <li
                  key={text}
                  className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-[12px] font-medium text-gray-600"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <Icon size={13} />
                  </span>
                  <span>
                    <span className="text-gray-400">{i + 1}.</span> {text}
                  </span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="mt-6 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              <SearchIcon size={14} />
              Start a search
            </button>
          </div>
        )}

        {requests.length > 0 && (
          <>
            <div className="mb-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:gap-3">
              <StatTile
                label="Still open"
                value={stats.open}
                icon={ClockIcon}
              />
              <StatTile
                label="Businesses reached"
                value={stats.reached}
                icon={UsersIcon}
              />
              <StatTile
                label="Offers received"
                value={stats.offers}
                icon={TagIcon}
                highlight={grouped.offers.length > 0}
              />
            </div>

            {/* The one thing a buyer can miss: nobody is going to message
                them. Accepting releases nothing to the business, so an offer
                sits until the buyer acts on it. */}
            {grouped.offers.length > 0 && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                  <SparklesIcon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {grouped.offers.length === 1
                      ? "A request has offers waiting on you"
                      : `${grouped.offers.length} requests have offers waiting on you`}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-gray-600">
                    Businesses can&apos;t see your number, so they won&apos;t
                    reach out first — compare the offers below and message the
                    one you want.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-8">
              {SECTIONS.map((section) => {
                const items = grouped[section.id];
                if (!items.length) return null;
                const shown =
                  section.id === "past" && !showAllPast
                    ? items.slice(0, PAST_PREVIEW)
                    : items;
                return (
                  <section
                    key={section.id}
                    aria-labelledby={`requests-${section.id}`}
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <div>
                        <h2
                          id={`requests-${section.id}`}
                          className="flex items-center gap-2 text-sm font-semibold text-ink"
                        >
                          {section.title}
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500">
                            {items.length}
                          </span>
                        </h2>
                        <p className="mt-0.5 text-[12px] text-gray-400">
                          {section.hint}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {shown.map((request, i) => (
                        <RequestCard
                          key={request.id}
                          request={request}
                          now={now}
                          index={i}
                        />
                      ))}
                    </div>
                    {section.id === "past" && items.length > shown.length && (
                      <button
                        type="button"
                        onClick={() => setShowAllPast(true)}
                        className="mt-3 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700"
                      >
                        <ChevronDownIcon size={13} />
                        Show all {items.length} past requests
                      </button>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
