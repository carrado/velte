"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { DashboardLink } from "@/components/DashboardLink";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FlameIcon,
  ListIcon,
  MessageCircleIcon,
  PackageIcon,
  PlusCircleIcon,
  SendIcon,
  SparklesIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
  XCircleIcon,
} from "@/components/icons/hero";
import { ClipboardListIllustration } from "@/components/icons";
import { queryKeys } from "@/lib/query-keys";
import { fetchVendorBuyerRequests } from "@/services/vendorBuyerRequests";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { msLeft, URGENT_MS, windowElapsed } from "@/lib/requestWindow";
import { useNow } from "@/hooks/useNow";
import { Countdown } from "./Countdown";
import { leadCost, walletApi } from "@/services/wallet";
import type { IconComponent } from "@/types/common";
import {
  vendorRequestOutcome,
  vendorRequestTab,
} from "@/lib/vendorRequestOutcome";
import type {
  BuyerRequest,
  VendorRequestOutcome,
  VendorRequestTab,
} from "@/types/buyerRequest";

// The vendor's Buyer Requests list (/{id}/buyer-requests) — requests THEY
// were matched to (server-filtered, see vendorBuyerRequests.controller.js's
// listMatchedRequests: "do not expose every irrelevant request to every
// vendor"), not a general feed. Each card opens the detail page, where the
// vendor sends their price (see VendorRequestDetail.tsx).
//
// Redesigned 2026-09-24 (explicit request, "a very strong and rich UI"):
// a summary header, the money rule stated up front (accepting is free; the
// lead fee lands only when the buyer messages), tabs by what the vendor has
// done, and cards that carry what decides whether a request is worth
// answering — budget, time left, how many other businesses got it.
//
// The backend only lists ACTIVE requests, so there is no "closed" tab: a
// request that lapses simply leaves the list.

const TABS: { id: VendorRequestTab; label: string }[] = [
  { id: "new", label: "New" },
  { id: "awaiting", label: "Awaiting buyer" },
  { id: "won", label: "Won" },
  { id: "past", label: "Past" },
];

/** The status pill on a card, per outcome. None on a new request
 *  (2026-09-24, explicit request) — its orange border and "Send your price"
 *  button already say it's waiting on the vendor. */
function OutcomePill({ outcome }: { outcome: VendorRequestOutcome }) {
  const base =
    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold";
  switch (outcome) {
    case "new":
      return null;
    case "awaiting":
      return (
        <span className={cn(base, "bg-orange-50 text-orange-700")}>
          <CheckCircleIcon size={11} />
          Offer sent
        </span>
      );
    case "won":
      return (
        <span className={cn(base, "bg-orange-500 text-white")}>
          <StarIcon size={11} />
          Won
        </span>
      );
    case "lost":
      return (
        <span className={cn(base, "bg-gray-100 text-gray-500")}>
          Buyer chose another
        </span>
      );
    case "declined":
      return (
        <span className={cn(base, "bg-gray-100 text-gray-500")}>
          <XCircleIcon size={11} />
          Declined
        </span>
      );
    default:
      return (
        <span className={cn(base, "bg-gray-100 text-gray-500")}>Closed</span>
      );
  }
}

/** First name only on a card — the full name is on the detail page. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "A buyer";
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: IconComponent;
  tone?: "default" | "strong" | "urgent";
}) {
  return (
    // Mobile: icon + figure share the top row and the label gets the full
    // tile width underneath, so it wraps instead of truncating to "Closing…".
    // From sm up there's room for the label beside the icon again.
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5 rounded-2xl border border-gray-100 bg-surface px-4 py-3.5 sm:gap-y-1">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:row-span-2 sm:h-10 sm:w-10",
          tone === "strong" && "bg-orange-500 text-white",
          tone === "urgent" && "bg-red-50 text-red-600",
          tone === "default" && "bg-orange-50 text-orange-600",
        )}
      >
        <Icon size={16} />
      </span>
      <p className="min-w-0 text-lg font-bold leading-none text-ink sm:self-end sm:text-xl">
        {value}
      </p>
      <p className="col-span-2 min-w-0 text-[12px] font-medium leading-snug text-gray-400 sm:col-span-1 sm:self-start sm:truncate">
        {label}
      </p>
    </div>
  );
}

function RequestCard({
  request,
  href,
  now,
  index,
}: {
  request: BuyerRequest;
  href: string;
  now: number;
  index: number;
}) {
  const outcome = vendorRequestOutcome(request, now);
  const open = outcome === "new" || outcome === "awaiting";
  const left = msLeft(request.expiresAt, now);
  const urgent = outcome === "new" && left > 0 && left < URGENT_MS;
  const quoted = request.myQuote?.priceKobo ?? null;
  const elapsed = windowElapsed(request.createdAt, request.expiresAt, now);
  const matched = request.matchedVendorIds.length;
  const others = request.acceptedCount ?? 0;
  const active = outcome === "new" || outcome === "won";

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.04 }}
      className="border-b border-gray-100"
    >
      {/* Square, full-width blocks (2026-09-26) — the list reads as one
          continuous column of requests rather than a grid of cards. The
          orange rail is what used to be the card's orange border: it keeps
          "this one is waiting on you / you won this" without a radius. */}
      <DashboardLink
        href={href}
        className={cn(
          "group flex h-full flex-col bg-surface px-4 py-4 transition-colors sm:px-5 sm:py-5",
          active ? "hover:bg-orange-50/40" : "hover:bg-gray-50",
        )}
      >
        <div className="flex items-start gap-3">
          {request.imageUrl ? (
            <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50">
              <img
                src={optimizedImageUrl(request.imageUrl)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </span>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <PackageIcon size={24} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[12px] text-gray-400">
                <span className="font-semibold text-gray-600">
                  {firstName(request.buyerName)}
                </span>{" "}
                · {timeAgo(request.createdAt, now)}
              </p>
              <OutcomePill outcome={outcome} />
            </div>
            <p className="mt-1 line-clamp-3 text-[14px] font-medium leading-snug text-ink sm:text-[15px]">
              {request.description}
            </p>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              request.budgetKobo != null
                ? "bg-orange-50 text-orange-700"
                : "bg-gray-100 text-gray-500",
            )}
          >
            <WalletIcon size={11} />
            {request.budgetKobo != null
              ? formatNaira(request.budgetKobo)
              : "No budget given"}
          </span>
          {quoted != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-ink">
              <TagIcon size={11} />
              You quoted {formatNaira(quoted)}
            </span>
          )}
          {open && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                urgent ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500",
              )}
            >
              {urgent ? <FlameIcon size={11} /> : <ClockIcon size={11} />}
              <Countdown expiresAt={request.expiresAt} suffix=" left" />
            </span>
          )}
          {outcome === "won" && request.myContactedAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
              <MessageCircleIcon size={11} />
              Messaged you {timeAgo(request.myContactedAt, now)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
            <UsersIcon size={11} />
            {matched <= 1 ? "Only you" : `${matched} businesses`}
          </span>
          {open && others > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
              <TagIcon size={11} />
              {others === 1 ? "1 offer in" : `${others} offers in`}
            </span>
          )}
        </div>

        {/* How much of the request's window has run — open requests only. */}
        {open && (
          <div className="mt-3.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                "h-full rounded-full",
                urgent ? "bg-red-400" : "bg-orange-400",
              )}
              style={{ width: `${Math.round(elapsed * 100)}%` }}
            />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="text-[12px] text-gray-400">
            {request.location ? "Location shared" : "No location"}
          </span>
          {outcome === "new" ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors group-hover:bg-orange-600">
              Send your price
              <ArrowRightIcon size={14} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-orange-600">
              {outcome === "awaiting" ? "View your offer" : "View request"}
              <ArrowRightIcon size={14} />
            </span>
          )}
        </div>
      </DashboardLink>
    </motion.li>
  );
}

function EmptyState({
  tab,
  vendorId,
}: {
  tab: VendorRequestTab;
  vendorId: string;
}) {
  if (tab !== "new") {
    const message: Record<Exclude<VendorRequestTab, "new">, string> = {
      awaiting: "No offers waiting on a buyer right now.",
      won: "No wins yet. When a buyer picks you and messages you, it shows up here.",
      past: "Requests you answered show up here once they close.",
    };
    return (
      <div className="border-b border-dashed border-gray-200 bg-surface p-8 text-center">
        <p className="mx-auto max-w-sm text-sm font-medium text-gray-500">
          {message[tab]}
        </p>
      </div>
    );
  }
  return (
    <div className="border-b border-dashed border-gray-200 bg-surface p-8 text-center sm:p-10">
      <ClipboardListIllustration size={64} className="mx-auto" />
      <p className="mt-4 text-base font-semibold text-ink">
        No new requests right now
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gray-500">
        When a buyer asks Velte for something you sell and nobody has it listed,
        Velte sends the request to matching businesses like yours. The clearer
        your store, the more you get matched.
      </p>
      <div className="mx-auto mt-6 grid max-w-md gap-2 sm:grid-cols-2">
        <DashboardLink
          href={`/${vendorId}/products/add`}
          className="flex items-center gap-2.5 rounded-xl border border-gray-100 px-3.5 py-3 text-left text-[13px] font-semibold text-ink transition-colors hover:border-orange-200 hover:bg-orange-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <PlusCircleIcon size={16} />
          </span>
          Add a listing
        </DashboardLink>
        <DashboardLink
          href={`/${vendorId}/store`}
          className="flex items-center gap-2.5 rounded-xl border border-gray-100 px-3.5 py-3 text-left text-[13px] font-semibold text-ink transition-colors hover:border-orange-200 hover:bg-orange-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <StoreIcon size={16} />
          </span>
          Complete your store
        </DashboardLink>
      </div>
    </div>
  );
}

export function VendorRequestsPage() {
  const params = useParams<{ id: string }>();
  const now = useNow(60_000);
  const [tab, setTab] = useState<VendorRequestTab>("new");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.vendorBuyerRequests.list,
    queryFn: fetchVendorBuyerRequests,
  });
  const { data: wallet } = useQuery({
    queryKey: queryKeys.wallet.detail,
    queryFn: walletApi.getWallet,
  });

  // Since 2026-09-24 the list carries history too: open requests matched to
  // this vendor, plus everything they answered in the last 90 days. Sorted
  // into tabs by vendorRequestOutcome — the same rule the nav badge uses,
  // so the two never disagree.
  const byTab = useMemo(() => {
    const out: Record<VendorRequestTab, BuyerRequest[]> = {
      new: [],
      awaiting: [],
      won: [],
      past: [],
    };
    for (const r of data?.requests ?? []) {
      const outcome = vendorRequestOutcome(r, now);
      // An unanswered request that closed isn't history — never engaged.
      if (outcome === "closed" && !r.myDecision) continue;
      out[vendorRequestTab(outcome)].push(r);
    }
    const time = (iso: string | null | undefined) =>
      iso ? new Date(iso).getTime() : 0;
    // Open ones: closing soonest first — that's the one to act on now.
    out.new.sort((a, b) => time(a.expiresAt) - time(b.expiresAt));
    out.awaiting.sort((a, b) => time(a.expiresAt) - time(b.expiresAt));
    // Wins: most recent first. Past keeps the backend's newest-first order.
    out.won.sort((a, b) => time(b.myContactedAt) - time(a.myContactedAt));
    return out;
  }, [data, now]);
  const closingSoon = byTab.new.filter(
    (r) => msLeft(r.expiresAt, now) < URGENT_MS,
  ).length;

  const leadFee = leadCost();
  const balance = wallet?.balanceKobo ?? null;
  // Optimistic while the wallet loads, so a slow request never reads as an
  // empty wallet.
  const canAccept = balance === null || balance >= leadFee;
  const visible = byTab[tab];

  return (
    <div className="mx-auto max-w-6xl space-y-5 md:px-0">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <section className="overflow-hidden md:rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-surface to-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white">
              <SparklesIcon size={12} />
              Matched to your store
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink">
              People are asking for what you sell
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              Send your price — it&apos;s free. You only pay{" "}
              {formatNaira(leadFee)} if the buyer picks you and messages you.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatTile
            label="Waiting on you"
            value={byTab.new.length}
            icon={SendIcon}
            tone={byTab.new.length > 0 ? "strong" : "default"}
          />
          <StatTile
            label="Closing within 6h"
            value={closingSoon}
            icon={FlameIcon}
            tone={closingSoon > 0 ? "urgent" : "default"}
          />
          <StatTile
            label="Awaiting buyer"
            value={byTab.awaiting.length}
            icon={TagIcon}
          />
          <StatTile
            label="Won · last 90 days"
            value={byTab.won.length}
            icon={StarIcon}
            tone={byTab.won.length > 0 ? "strong" : "default"}
          />
        </div>
      </section>

      {/* ── Money line ─────────────────────────────────────────────── */}
      {!canAccept ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <WalletIcon size={17} />
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-amber-800">
            <span className="font-semibold">Top up to answer requests.</span>{" "}
            You need {formatNaira(leadFee)} available to send an offer — your
            balance is {formatNaira(balance ?? 0)}.
          </p>
          <DashboardLink
            href={`/${params.id}/wallet`}
            className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Top up
          </DashboardLink>
        </div>
      ) : (
        <div className="grid gap-2 sm:rounded-2xl border border-gray-100 bg-surface p-3 sm:grid-cols-3 sm:p-4">
          {[
            {
              n: 1,
              title: "Buyer asks",
              text: "Velte sends you their request",
            },
            {
              n: 2,
              title: "You send a price",
              text: "Free — no charge to answer",
            },
            {
              n: 3,
              title: "They message you",
              text: `${formatNaira(leadFee)} only then, once per buyer`,
            },
          ].map((step) => (
            <div
              key={step.n}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[12px] font-bold text-orange-600">
                {step.n}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">
                  {step.title}
                </p>
                <p className="truncate text-[12px] text-gray-400">
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        {/* Scrolls sideways on narrow phones instead of squashing the tabs;
            swipeable by touch, scrollbar hidden so it reads as a strip. */}
        <div className="flex min-w-0 overflow-x-auto overscroll-x-contain sm:rounded-xl border border-gray-100 bg-surface p-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={(e) => {
                setTab(t.id);
                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "nearest",
                });
              }}
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                tab === t.id
                  ? "bg-orange-500 text-white"
                  : "text-gray-500 hover:bg-gray-50",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px]",
                  tab === t.id ? "bg-white/25" : "bg-gray-100 text-gray-500",
                )}
              >
                {byTab[t.id].length}
              </span>
            </button>
          ))}
        </div>
        <span className="hidden items-center gap-1 text-[12px] text-gray-400 sm:inline-flex">
          <ListIcon size={13} />
          {tab === "new" || tab === "awaiting"
            ? "Closing soonest first"
            : "Newest first"}
        </span>
      </div>

      {/* ── List ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <ul className="border-t border-gray-100">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-56 animate-pulse border-b border-gray-100 bg-gray-50"
            />
          ))}
        </ul>
      ) : isError ? (
        <div className="border-b border-gray-100 bg-surface p-6 text-center">
          <p className="text-sm text-gray-500">
            Couldn&apos;t load your requests just now.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 cursor-pointer text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState tab={tab} vendorId={params.id} />
      ) : (
        <ul className="border-t border-gray-100">
          {visible.map((request, i) => (
            <RequestCard
              key={request.id}
              request={request}
              href={`/${params.id}/buyer-requests/${request.id}`}
              now={now}
              index={i}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
