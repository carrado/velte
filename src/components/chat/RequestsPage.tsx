"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import {
  CheckCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  MessageCircleIcon,
  SearchIcon,
  StoreIcon,
  UsersIcon,
  ClipboardListIllustration,
} from "@/components/icons";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { Avatar } from "@/components/Avatar";
import { fetchMyRequests } from "@/services/buyerRequests";
import { useBuyerStore } from "@/store/buyerStore";
import { cn, formatNaira } from "@/lib/utils";
import { compareQuotes, leadTimeLabel } from "@/lib/quoteCompare";
import { buildChatLink } from "@/lib/chatLink";
import type {
  BuyerRequestResponder,
  MyBuyerRequest,
} from "@/types/buyerRequest";

// "Your requests" — the buyer's own view of every Buyer Request they have
// sent out (2026-08-30). The answer to the one question the chat cannot
// answer once the conversation scrolls away: did anything come of it?
//
// A request is never created from this page — that only ever happens inside a
// conversation, after a search genuinely found nothing and the buyer agreed
// to let Velte reach out (see systemPrompt.ts, which forbids
// createBuyerRequest in any other situation). So this page is deliberately
// read-only: it reports, and every action on it leads back to a search.
//
// Buyer session ONLY: a request belongs to the Buyer document that created
// it, and a vendor's own view of the requests they were matched to is a
// different page entirely (/{id}/buyer-requests).

const HOUR = 3_600_000;

/** Ticks so an open request's countdown stays honest while the page is left
 *  open — a "2h left" that silently becomes wrong is worse than no number. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function timeAgo(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((now - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/** Rounded DOWN, deliberately: "3h left" that turns out to be 3h20m is a
 *  pleasant surprise; the other way round is a broken promise. */
function timeLeft(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return "closing";
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
  const hours = Math.floor(ms / HOUR);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

function place(area: string | null, state: string | null): string | null {
  return [area, state].filter(Boolean).join(", ") || null;
}

// ── Status ─────────────────────────────────────────────────────────────────
// Four stored statuses, but only three things a buyer needs to tell apart:
// still out there, someone took it, and over. "answered" is derived rather
// than stored — a request stays `active` while vendors accept, and that
// acceptance is the whole point, so it must never read as merely "waiting".
type Tone = "open" | "answered" | "closed";

function toneOf(request: MyBuyerRequest): Tone {
  if (request.acceptedCount > 0) return "answered";
  return request.status === "active" ? "open" : "closed";
}

const TONE_STYLES: Record<Tone, string> = {
  open: "border-orange-200 bg-orange-50 text-orange-700",
  answered: "border-green-200 bg-green-50 text-green-700",
  closed: "border-gray-200 bg-gray-50 text-gray-500",
};

const TONE_DOT: Record<Tone, string> = {
  open: "bg-orange-500",
  answered: "bg-green-500",
  closed: "bg-gray-300",
};

function statusLabel(request: MyBuyerRequest, now: number): string {
  const tone = toneOf(request);
  if (tone === "answered") {
    return request.acceptedCount === 1
      ? "1 business accepted"
      : `${request.acceptedCount} businesses accepted`;
  }
  if (tone === "open") return `Open · ${timeLeft(request.expiresAt, now)}`;
  if (request.status === "cancelled") return "Cancelled";
  if (request.status === "fulfilled") return "Fulfilled";
  return "Closed";
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
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          TONE_DOT[tone],
          // Only while it is genuinely still running — a pulse on a closed
          // request would read as activity that is not happening.
          tone === "open" && "animate-pulse",
        )}
      />
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

// ── One accepted business ──────────────────────────────────────────────────
// A vendor who ACCEPTED. Since 2026-09-03 accepting is free and releases
// nothing: they stated a price and are waiting to be picked, and the BUYER is
// the one who opens the conversation. This row therefore carries the page's
// primary action rather than being the courtesy it used to be.
//
// Message goes through /api/chat — the same route every other buyer-facing
// WhatsApp CTA already uses — which resolves the vendor's number server-side
// and bills the lead on the journey. That is precisely what lets the fee be
// charged on CONTACT instead of on accept: the click passes through a route
// Velte controls, so the connection is countable. A plain wa.me href would be
// unbillable, and would put the number in the DOM besides.
//
// The row is a flex container rather than one big <Link>: a button nested
// inside a link is invalid and unreachable by keyboard. The details link to
// the store; Message sits beside them as its own control.
function ResponderRow({
  responder,
  requestId,
  requestDescription,
  now,
  badge,
}: {
  responder: BuyerRequestResponder;
  /** Both are needed for the handoff: the id keys the lead to THIS request,
   *  so the backend can bill once per (request, vendor) rather than once per
   *  click; the description is what the prefill reminds them they answered. */
  requestId: string;
  requestDescription: string;
  now: number;
  /** "Cheapest" / "Fastest" / null — set by the comparison in RequestCard,
   *  never derived here: one row cannot know what the others cost, and a
   *  badge computed per-row would be the easiest possible way to end up
   *  with two "Cheapest" labels on one card. */
  badge?: string | null;
}) {
  const where = place(responder.area, responder.state);
  const lead = leadTimeLabel(responder.leadTimeDays);
  const chatHref = buildChatLink({
    vendorId: responder.vendorId,
    source: "buyer_request",
    requestId,
    message: contactMessage(responder, requestDescription),
  });
  const body = (
    <>
      <Avatar
        src={responder.avatar}
        label={responder.name.trim().charAt(0).toUpperCase()}
        className="h-9 w-9"
        loading="lazy"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-medium text-[#023337]">
            {responder.name}
          </span>
          {badge && (
            <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
              {badge}
            </span>
          )}
        </span>

        {/* The quote, or the honest absence of one. A vendor who accepted
            without naming a price is not shown as worse than one who did —
            they are shown as unanswered, with the thing to do about it. */}
        {responder.priceKobo != null ? (
          <span className="block truncate text-[13px] font-semibold text-[#023337]">
            {formatNaira(responder.priceKobo)}
            {lead && (
              <span className="font-normal text-gray-500"> · {lead}</span>
            )}
          </span>
        ) : (
          <span className="block truncate text-[12px] text-gray-400">
            No price given — ask them
          </span>
        )}

        {responder.note && (
          <span className="block truncate text-[11px] text-gray-500">
            {responder.note}
          </span>
        )}

        <span className="block truncate text-[11px] text-gray-400">
          {where ? `${where} · ` : ""}
          accepted {timeAgo(responder.respondedAt, now)}
        </span>
      </span>
    </>
  );

  const details = responder.storeHandle ? (
    <Link
      href={`/store/${responder.storeHandle}`}
      className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50"
    >
      {body}
      <span className="flex shrink-0 items-center gap-1 text-gray-400 transition-colors group-hover:text-orange-600">
        <StoreIcon size={13} />
        <ExternalLinkIcon size={11} />
      </span>
    </Link>
  ) : (
    // No store row yet — one is created lazily on the vendor's first dashboard
    // visit. Shown without a store link rather than dropped, and unlike before
    // that no longer means unreachable: Message does not depend on a
    // storefront existing, so this vendor can still be contacted.
    <span className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
      {body}
    </span>
  );

  return (
    <li className="flex items-center gap-1">
      {details}
      {chatHref && (
        <a
          href={chatHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Message ${responder.name} on WhatsApp`}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <MessageCircleIcon size={14} />
          <span className="hidden sm:inline">Message</span>
        </a>
      )}
    </li>
  );
}

function RequestCard({
  request,
  now,
}: {
  request: MyBuyerRequest;
  now: number;
}) {
  const tone = toneOf(request);
  const [showAll, setShowAll] = useState(false);

  // How much of this request's own window has run — computed from its two
  // stored timestamps rather than a hardcoded 48h, so changing
  // BUYER_REQUEST_EXPIRY_HOURS in the backend cannot quietly make this lie.
  const started = new Date(request.createdAt).getTime();
  const ends = new Date(request.expiresAt).getTime();
  const elapsed =
    ends > started
      ? Math.min(1, Math.max(0, (now - started) / (ends - started)))
      : 1;

  // The comparison (2026-09-03) — deterministic, no model, see
  // lib/quoteCompare.ts. Computed here rather than per-row because every
  // verdict below is RELATIVE: which quote is cheapest is not a fact about
  // any one of them.
  const comparison = useMemo(
    () => compareQuotes(request.responders),
    [request.responders],
  );

  // Priced offers first, cheapest first, then everyone who accepted without
  // naming terms. This is the ordering the comparison itself produces, and
  // using it here is what keeps the badges below pointing at the right rows.
  const ordered = useMemo(
    () => [...comparison.quoted, ...comparison.unquoted],
    [comparison],
  );

  const badges = useMemo(() => {
    const map = new Map<string, string>();
    // Deliberately assigned in this order and never overwritten: a vendor who
    // is both the recommendation and the cheapest reads better as
    // "Recommended", and two badges on one row is noise.
    if (comparison.recommendation) {
      map.set(comparison.recommendation.responder.vendorId, "Recommended");
    }
    if (comparison.cheapest && !map.has(comparison.cheapest.vendorId)) {
      map.set(comparison.cheapest.vendorId, "Cheapest");
    }
    if (comparison.fastest && !map.has(comparison.fastest.vendorId)) {
      map.set(comparison.fastest.vendorId, "Fastest");
    }
    return map;
  }, [comparison]);

  const visible = showAll ? ordered : ordered.slice(0, 3);
  const hidden = ordered.length - visible.length;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-sm",
        tone === "answered" ? "border-green-100" : "border-gray-100",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {request.budgetKobo != null && (
          <p className="mb-2 text-[12px] text-gray-500">
            Budget shown to businesses:{" "}
            <span className="font-semibold text-[#023337]">
              {formatNaira(request.budgetKobo)}
            </span>
          </p>
        )}

        {request.imageUrl && (
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
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm leading-relaxed text-[#023337]">
              {request.description}
            </p>
            <StatusPill request={request} now={now} />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
            <span className="inline-flex items-center gap-1">
              <ClockIcon size={12} />
              Sent {timeAgo(request.createdAt, now)}
            </span>
            <span className="inline-flex items-center gap-1">
              <UsersIcon size={12} />
              {request.matchedVendorCount === 1
                ? "1 business contacted"
                : `${request.matchedVendorCount} businesses contacted`}
            </span>
            {request.acceptedCount > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-green-600">
                <CheckCircleIcon size={12} />
                {request.acceptedCount} accepted
              </span>
            )}
          </div>

          {/* The window, drawn — an open request is a thing with a deadline,
              and a bar says that faster than a sentence can. Only while it is
              actually running; on a closed one it would be a full bar saying
              nothing. */}
          {request.status === "active" && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  tone === "answered" ? "bg-green-400" : "bg-orange-400",
                )}
                style={{ width: `${Math.round(elapsed * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* What came back. Three states, each with something to say — a blank
          space under an open request is exactly where a buyer decides the
          feature does not work. */}
      {request.responders.length > 0 ? (
        <div className="border-t border-gray-100 bg-[#FAFAFA] px-3 py-2">
          <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {comparison.quoted.length > 1 ? "Compare offers" : "Who accepted"}
          </p>

          {/* The verdict, with the sentence that justifies it. Never a bare
              "best overall": every recommendation quoteCompare returns
              carries its own reason, built from the same numbers on the rows
              below, so a buyer can check it rather than trust it. */}
          {comparison.recommendation && (
            <div className="mx-2 mb-2 rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2">
              <p className="text-[12px] font-semibold text-[#023337]">
                Best pick: {comparison.recommendation.responder.name}
              </p>
              <p className="text-[11px] leading-relaxed text-gray-600">
                {comparison.recommendation.reason}
              </p>
            </div>
          )}

          <ul>
            {visible.map((responder) => (
              <ResponderRow
                key={responder.vendorId}
                responder={responder}
                requestId={request.id}
                requestDescription={request.description}
                now={now}
                badge={badges.get(responder.vendorId) ?? null}
              />
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-1 w-full cursor-pointer rounded-xl px-2 py-1.5 text-left text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50"
            >
              Show {hidden} more
            </button>
          )}
          <p className="px-2 pb-1 pt-1.5 text-[11px] text-gray-400">
            They have your number and will message you on WhatsApp.
          </p>
        </div>
      ) : request.status === "active" ? (
        <div className="border-t border-gray-100 bg-[#FAFAFA] px-5 py-3">
          <p className="text-xs text-gray-500">
            No one has taken this up yet. The moment a business accepts,
            they&apos;ll message you on WhatsApp — you don&apos;t need to keep
            this page open.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-[#FAFAFA] px-5 py-3">
          <p className="text-xs text-gray-500">
            No business picked this one up before it closed.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700"
          >
            <SearchIcon size={12} />
            Try another search
          </Link>
        </div>
      )}
    </article>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <p
        className={cn(
          "text-xl font-bold",
          accent ? "text-green-600" : "text-[#023337]",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-gray-400">{label}</p>
    </div>
  );
}

type FilterId = "all" | "open" | "answered" | "closed";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "answered", label: "Answered" },
  { id: "closed", label: "Closed" },
];

// Overlapping on purpose: an open request that already has an acceptance
// counts under BOTH "Open" and "Answered". These are lenses on one list, not
// a partition of it, and "answered" is the one a buyer comes here for.
function matchesFilter(request: MyBuyerRequest, filter: FilterId): boolean {
  switch (filter) {
    case "open":
      return request.status === "active";
    case "answered":
      return request.acceptedCount > 0;
    case "closed":
      return request.status !== "active";
    default:
      return true;
  }
}

export function RequestsPage() {
  const buyer = useBuyerStore((s) => s.buyer);
  const [filter, setFilter] = useState<FilterId>("all");
  const now = useNow(60_000);

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
      accepted: requests.reduce((sum, r) => sum + r.acceptedCount, 0),
    }),
    [requests],
  );

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
          <h1 className="mt-4 text-lg font-bold text-[#023337]">
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

  const visible = requests.filter((r) => matchesFilter(r, filter));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-[#023337]">Your requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            What Velte asked businesses on your behalf, and who came back.
          </p>
        </header>

        {isLoading && (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
              />
            ))}
          </ul>
        )}

        {isError && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
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
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <ClipboardListIllustration size={56} className="mx-auto" />
            <p className="mt-4 text-sm font-semibold text-[#023337]">
              You haven&apos;t sent any requests yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">
              You don&apos;t make one from here. Search for what you need — if
              no business on Velte has it, Velte offers to reach out to the ones
              who might, and whatever comes back lands on this page.
            </p>
            <Link
              href="/chat"
              className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              <SearchIcon size={14} />
              Start a search
            </Link>
          </div>
        )}

        {requests.length > 0 && (
          <>
            <div className="mb-5 grid grid-cols-3 gap-2">
              <StatTile label="Still open" value={stats.open} />
              <StatTile label="Businesses reached" value={stats.reached} />
              <StatTile label="Accepted" value={stats.accepted} accent />
            </div>

            {/* Only once there is enough to sort through — four tabs over two
                requests is furniture, not navigation. */}
            {requests.length > 2 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {FILTERS.map((tab) => {
                  const count = requests.filter((r) =>
                    matchesFilter(r, tab.id),
                  ).length;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={cn(
                        "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        filter === tab.id
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50",
                      )}
                    >
                      {tab.label}
                      <span className="ml-1.5 text-gray-400">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {visible.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                Nothing here under that filter.
              </p>
            ) : (
              <div className="space-y-3">
                {visible.map((request) => (
                  <RequestCard key={request.id} request={request} now={now} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
