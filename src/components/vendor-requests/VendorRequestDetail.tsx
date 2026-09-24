"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { DashboardLink } from "@/components/DashboardLink";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  FlameIcon,
  LoaderIcon,
  MapPinIcon,
  MessageCircleIcon,
  PackageIcon,
  SendIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
  XCircleIcon,
} from "@/components/icons/hero";
import { api, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { fetchVendorBuyerRequest } from "@/services/vendorBuyerRequests";
import { useNavigation } from "@/components/NavigationProgressContext";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { leadTimeLabel } from "@/lib/quoteCompare";
import {
  msLeft,
  timeLeft,
  URGENT_MS,
  windowElapsed,
} from "@/lib/requestWindow";
import { useNow } from "@/hooks/useNow";
import { vendorRequestOutcome } from "@/lib/vendorRequestOutcome";
import { leadCost, walletApi } from "@/services/wallet";
import type { IconComponent } from "@/types/common";
import type { BuyerRequestDecision } from "@/types/buyerRequest";

// One matched Buyer Request, and the vendor's answer to it
// (/{id}/buyer-requests/{requestId}).
//
// What accepting means today (since 2026-09-03): it is FREE and releases
// nothing. The vendor states terms, the buyer compares them with the other
// businesses that answered, and the lead fee is charged only if the buyer
// then messages this vendor (/api/chat → /search/lead). The wallet check
// here survives with a narrower meaning — "you must be able to cover one
// lead in order to accept" — which keeps the fee collectable later, when the
// person clicking is the buyer rather than the vendor.
//
// Redesigned 2026-09-24 (explicit request, "a very strong and rich UI"):
// the request on the left with the facts that decide whether it's worth
// answering, the offer form on the right — shown straight away rather than
// behind an Accept → confirm step, with the price read live against the
// buyer's budget. After accepting, the vendor's own quote is shown back
// (myQuote, detail endpoint) with what happens next.

function Fact({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: IconComponent;
  label: string;
  value: string;
  tone?: "default" | "accent" | "urgent";
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-surface px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        <Icon size={12} />
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-lg font-bold",
          tone === "accent" && "text-orange-600",
          tone === "urgent" && "text-red-600",
          tone === "default" && "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Naira typed into the box → a number, or null when empty/unreadable. */
function parseNaira(text: string): number | null {
  const n = Number(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Thousands separators while typing, without fighting the caret over
 *  decimals — kobo precision isn't something a vendor quotes in. */
function formatTyped(text: string): string {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits).toLocaleString("en-NG") : "";
}

const LEAD_TIME_CHIPS: { label: string; days: number }[] = [
  { label: "Today", days: 0 },
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "1 week", days: 7 },
];

const NOTE_MAX = 200;

export function VendorRequestDetail() {
  const params = useParams<{ id: string; requestId: string }>();
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const now = useNow(60_000);

  // Strings, not numbers: controlled inputs, and a half-typed value must
  // stay exactly as typed. Parsed once, on submit.
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteDays, setQuoteDays] = useState("");
  const [quoteNote, setQuoteNote] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.vendorBuyerRequests.detail(params.requestId),
    queryFn: () => fetchVendorBuyerRequest(params.requestId),
  });
  const { data: wallet } = useQuery({
    queryKey: queryKeys.wallet.detail,
    queryFn: walletApi.getWallet,
  });

  const decisionMutation = useMutation({
    mutationFn: (decision: BuyerRequestDecision) => {
      // Naira in the box, kobo on the wire — every money field in both repos
      // is kobo, and this is the one place a vendor types a human amount.
      // Empty or unreadable sends null, which is a permitted answer:
      // accepting without quoting stays allowed.
      const priceNaira = parseNaira(quotePrice);
      const days = Number(quoteDays.replace(/[^0-9]/g, ""));
      const quote =
        decision === "accepted"
          ? {
              priceKobo:
                priceNaira != null ? Math.round(priceNaira * 100) : null,
              leadTimeDays:
                quoteDays.trim() !== "" && Number.isInteger(days) && days >= 0
                  ? days
                  : null,
              note: quoteNote.trim() || null,
            }
          : undefined;
      return api.post<{ decision: BuyerRequestDecision }>(
        `/api/vendor/buyer-requests/${params.requestId}/decision`,
        { decision, ...(quote ? { quote } : {}) },
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendorBuyerRequests.list,
      });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      if (result.decision === "accepted") {
        toast.success("Offer sent — it's now with the buyer.");
      } else {
        toast.success("Declined.");
        navigate(`/${params.id}/buyer-requests`);
      }
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError ? error.message : "Something went wrong.",
      );
    },
  });

  const request = data?.request;
  const backHref = `/${params.id}/buyer-requests`;

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-4 px-4 md:px-0 lg:grid-cols-[1fr_380px]">
        <div className="h-96 animate-pulse rounded-3xl border border-gray-100 bg-gray-50" />
        <div className="h-80 animate-pulse rounded-3xl border border-gray-100 bg-gray-50" />
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-sm text-gray-500">
          This request isn&apos;t available — it may have closed.
        </p>
        <DashboardLink
          href={backHref}
          className="mt-3 inline-block text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          Back to buyer requests
        </DashboardLink>
      </div>
    );
  }

  const decision = request.myDecision;
  const left = msLeft(request.expiresAt, now);
  const isOpen = request.status === "active" && left > 0;
  // Where this request stands for THIS vendor — the same rule the list page
  // and nav badge use (lib/vendorRequestOutcome.ts).
  const outcome = vendorRequestOutcome(request, now);
  const urgent = isOpen && left < URGENT_MS;
  const elapsed = windowElapsed(request.createdAt, request.expiresAt, now);
  const matched = request.matchedVendorIds.length;
  const offersIn = request.acceptedCount ?? 0;

  const leadFee = leadCost();
  const balance = wallet?.balanceKobo ?? null;
  // Optimistic while the wallet loads, so a slow request never reads as an
  // empty wallet.
  const canAfford = balance === null || balance >= leadFee;

  const mapUrl = request.location
    ? `https://www.google.com/maps?q=${request.location.coordinates[1]},${request.location.coordinates[0]}`
    : null;

  // The typed price against the buyer's own budget, live — plain arithmetic
  // on two stated numbers, never a suggestion of what to charge.
  const typedNaira = parseNaira(quotePrice);
  const budgetNaira =
    request.budgetKobo != null ? request.budgetKobo / 100 : null;
  const delta =
    typedNaira != null && budgetNaira != null ? typedNaira - budgetNaira : null;

  const pending = decisionMutation.isPending;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pb-24 md:px-0">
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        {/* ── The request ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <article className="overflow-hidden rounded-3xl border border-gray-100 bg-surface">
            {request.imageUrl ? (
              <a
                href={request.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the buyer's photo"
                className="block bg-gray-50"
              >
                <img
                  src={optimizedImageUrl(request.imageUrl)}
                  alt="The buyer's photo of what they want"
                  className="max-h-80 w-full object-cover"
                />
              </a>
            ) : (
              <div className="flex h-28 items-center gap-3 bg-gradient-to-br from-orange-50 via-surface to-surface px-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
                  <PackageIcon size={22} />
                </span>
                <span className="text-[13px] text-gray-400">
                  No photo attached
                </span>
              </div>
            )}

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {outcome === "new" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    New request
                  </span>
                ) : outcome === "awaiting" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                    <CheckCircleIcon size={12} /> Offer sent
                  </span>
                ) : outcome === "won" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                    <StarIcon size={12} /> Won
                  </span>
                ) : outcome === "declined" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                    <XCircleIcon size={12} /> Declined
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                    {outcome === "lost"
                      ? "Buyer chose another business"
                      : "Closed"}
                  </span>
                )}
                <span className="text-[12px] text-gray-400">
                  Posted {timeAgo(request.createdAt, now)}
                </span>
              </div>

              <p className="mt-3 text-lg font-medium leading-relaxed text-ink sm:text-xl">
                {request.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                  {request.buyerName.trim().charAt(0).toUpperCase() || "B"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {request.buyerName}
                  </p>
                  <p className="text-[12px] text-gray-400">Buyer on Velte</p>
                </div>
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[13px] font-semibold text-gray-600 transition-colors hover:border-orange-200 hover:text-orange-600"
                  >
                    <MapPinIcon size={14} /> View location
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
                    <MapPinIcon size={13} /> No location shared
                  </span>
                )}
              </div>
            </div>
          </article>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Fact
              icon={WalletIcon}
              label="Budget"
              value={
                request.budgetKobo != null
                  ? formatNaira(request.budgetKobo)
                  : "Not given"
              }
              tone={request.budgetKobo != null ? "accent" : "default"}
            />
            <Fact
              icon={urgent ? FlameIcon : ClockIcon}
              label="Closes in"
              value={
                isOpen
                  ? timeLeft(request.expiresAt, now).replace(" left", "")
                  : "Closed"
              }
              tone={urgent ? "urgent" : "default"}
            />
            <Fact
              icon={UsersIcon}
              label="Sent to"
              value={matched <= 1 ? "Only you" : `${matched} businesses`}
            />
            <Fact icon={TagIcon} label="Offers in" value={String(offersIn)} />
          </div>

          {isOpen && (
            <div className="rounded-2xl border border-gray-100 bg-surface px-4 py-3">
              <div className="flex items-center justify-between text-[12px] text-gray-400">
                <span>Request window</span>
                <span
                  className={cn(
                    "font-semibold",
                    urgent ? "text-red-600" : "text-gray-500",
                  )}
                >
                  {timeLeft(request.expiresAt, now)}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    urgent ? "bg-red-400" : "bg-orange-400",
                  )}
                  style={{ width: `${Math.round(elapsed * 100)}%` }}
                />
              </div>
            </div>
          )}

          {request.budgetKobo == null && decision == null && isOpen && (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-[13px] text-gray-500">
              No budget given — quote your honest price. The buyer compares
              offers side by side.
            </p>
          )}
        </div>

        {/* ── The answer ──────────────────────────────────────────── */}
        <aside className="space-y-3 lg:sticky lg:top-4">
          {decision === "accepted" ? (
            <div
              className={cn(
                "overflow-hidden rounded-3xl border bg-surface",
                outcome === "awaiting" || outcome === "won"
                  ? "border-orange-200"
                  : "border-gray-100",
              )}
            >
              {outcome === "won" ? (
                <div className="bg-orange-500 px-5 py-4 text-white">
                  <p className="flex items-center gap-2 text-base font-bold">
                    <StarIcon size={18} /> {request.buyerName} picked you
                  </p>
                  <p className="mt-0.5 text-[13px] text-white/85">
                    They messaged you on WhatsApp
                    {request.myContactedAt
                      ? ` ${timeAgo(request.myContactedAt, now)}`
                      : ""}
                    . Carry on the conversation there.
                  </p>
                </div>
              ) : outcome === "awaiting" ? (
                <div className="bg-orange-500 px-5 py-4 text-white">
                  <p className="flex items-center gap-2 text-base font-bold">
                    <CheckCircleIcon size={18} /> Your offer is in
                  </p>
                  <p className="mt-0.5 text-[13px] text-white/85">
                    {request.buyerName} sees it next to every other business
                    that answered.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 px-5 py-4">
                  <p className="text-base font-bold text-ink">
                    {outcome === "lost"
                      ? `${request.buyerName} went with another business`
                      : "Closed without a pick"}
                  </p>
                  <p className="mt-0.5 text-[13px] text-gray-500">
                    {outcome === "lost"
                      ? "Your offer was on their comparison — they messaged someone else."
                      : "The request ran out before the buyer chose anyone."}
                  </p>
                </div>
              )}
              <div className="space-y-3 p-5">
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    You quoted
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-ink">
                    {request.myQuote?.priceKobo != null
                      ? formatNaira(request.myQuote.priceKobo)
                      : "No price"}
                  </p>
                  {leadTimeLabel(request.myQuote?.leadTimeDays ?? null) && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-gray-500">
                      <ClockIcon size={12} />
                      {leadTimeLabel(request.myQuote?.leadTimeDays ?? null)}
                    </p>
                  )}
                  {request.myQuote?.note && (
                    <p className="mt-2 border-l-2 border-orange-200 pl-2.5 text-[12px] italic text-gray-600">
                      &ldquo;{request.myQuote.note}&rdquo;
                    </p>
                  )}
                </div>
                {outcome === "awaiting" || outcome === "won" ? (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {outcome === "won" ? "How it went" : "What happens next"}
                    </p>
                    <ol className="space-y-2.5">
                      {[
                        {
                          done: true,
                          text: "Your offer was sent to the buyer",
                        },
                        {
                          done: outcome === "won",
                          text: `${request.buyerName} compared the offers`,
                        },
                        {
                          done: outcome === "won",
                          text:
                            outcome === "won"
                              ? "They picked you and messaged you on WhatsApp"
                              : `If they pick you, they message you on WhatsApp — ${formatNaira(leadFee)} is deducted then`,
                        },
                      ].map((step, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-[13px]"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                              step.done
                                ? "bg-orange-500 text-white"
                                : "border-2 border-gray-200",
                            )}
                          >
                            {step.done && <CheckIcon size={11} />}
                          </span>
                          <span
                            className={step.done ? "text-ink" : "text-gray-500"}
                          >
                            {step.text}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2 text-[12px] text-orange-700">
                      <MessageCircleIcon size={13} />
                      {outcome === "won"
                        ? "Check WhatsApp — that's where they reached you."
                        : "Keep WhatsApp handy — that's where they'll reach you."}
                    </p>
                  </>
                ) : (
                  <p className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-[12px] leading-relaxed text-gray-600">
                    <SparklesIcon
                      size={13}
                      className="mt-0.5 shrink-0 text-orange-500"
                    />
                    Buyers see priced offers first. A clear price and delivery
                    time put you at the top of their comparison next time.
                  </p>
                )}
              </div>
            </div>
          ) : decision === "declined" ? (
            <div className="rounded-3xl border border-gray-100 bg-surface p-5">
              <p className="flex items-center gap-2 font-semibold text-gray-600">
                <XCircleIcon size={18} /> You declined this request
              </p>
              <p className="mt-1 text-[13px] text-gray-400">
                It cost you nothing, and the buyer isn&apos;t told.
              </p>
            </div>
          ) : !isOpen ? (
            <div className="rounded-3xl border border-gray-100 bg-surface p-5">
              <p className="font-semibold text-gray-600">
                This request has closed
              </p>
              <p className="mt-1 text-[13px] text-gray-400">
                New ones will show up in your buyer requests as buyers ask.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canAfford && !pending) decisionMutation.mutate("accepted");
              }}
              className="overflow-hidden rounded-3xl border border-orange-200 bg-surface shadow-sm"
            >
              <div className="border-b border-orange-100 bg-orange-50 px-5 py-4">
                <p className="flex items-center gap-2 text-base font-bold text-ink">
                  <SendIcon size={17} className="text-orange-500" />
                  Send your offer
                </p>
                <p className="mt-0.5 text-[13px] text-gray-500">
                  {matched > 1
                    ? `${matched} businesses got this. A clear price puts you on the buyer's comparison.`
                    : "Quote a price to stand out."}
                </p>
              </div>

              <div className="space-y-4 p-5">
                <label className="block">
                  <span className="flex items-baseline justify-between text-[12px] font-semibold text-gray-600">
                    Your price
                    <span className="font-normal text-gray-400">optional</span>
                  </span>
                  <span className="mt-1.5 flex items-center rounded-xl border border-gray-200 bg-surface focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
                    <span className="pl-3.5 text-lg font-semibold text-gray-400">
                      ₦
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={quotePrice}
                      onChange={(e) =>
                        setQuotePrice(formatTyped(e.target.value))
                      }
                      placeholder="0"
                      className="w-full bg-transparent px-2 py-3 text-lg font-semibold text-ink outline-none placeholder:text-gray-300"
                    />
                  </span>
                  {delta != null ? (
                    <span
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium",
                        delta > 0 ? "text-red-600" : "text-orange-700",
                      )}
                    >
                      <WalletIcon size={12} />
                      {delta === 0
                        ? "Matches their budget"
                        : delta < 0
                          ? `${formatNaira(-delta * 100)} under their budget`
                          : `${formatNaira(delta * 100)} over their budget`}
                    </span>
                  ) : budgetNaira != null ? (
                    <button
                      type="button"
                      onClick={() =>
                        setQuotePrice(budgetNaira.toLocaleString("en-NG"))
                      }
                      className="mt-1.5 cursor-pointer text-[12px] font-semibold text-orange-600 hover:text-orange-700"
                    >
                      Use their budget ({formatNaira(request.budgetKobo!)})
                    </button>
                  ) : null}
                </label>

                <div>
                  <p className="text-[12px] font-semibold text-gray-600">
                    Ready in
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {LEAD_TIME_CHIPS.map((chip) => {
                      const on = quoteDays === String(chip.days);
                      return (
                        <button
                          key={chip.days}
                          type="button"
                          onClick={() =>
                            setQuoteDays(on ? "" : String(chip.days))
                          }
                          className={cn(
                            "cursor-pointer rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                            on
                              ? "border-orange-500 bg-orange-500 text-white"
                              : "border-gray-200 text-gray-600 hover:border-orange-200",
                          )}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                    <label className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 text-[12px] text-gray-500 focus-within:border-orange-400">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          LEAD_TIME_CHIPS.some(
                            (c) => String(c.days) === quoteDays,
                          )
                            ? ""
                            : quoteDays
                        }
                        onChange={(e) =>
                          setQuoteDays(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="Other"
                        aria-label="Ready in, days"
                        className="w-10 bg-transparent py-1.5 text-center font-semibold text-ink outline-none placeholder:font-normal placeholder:text-gray-400"
                      />
                      days
                    </label>
                  </div>
                </div>

                <label className="block">
                  <span className="flex items-baseline justify-between text-[12px] font-semibold text-gray-600">
                    Anything else?
                    <span className="font-normal text-gray-400">
                      {quoteNote.length}/{NOTE_MAX}
                    </span>
                  </span>
                  <textarea
                    rows={2}
                    maxLength={NOTE_MAX}
                    value={quoteNote}
                    onChange={(e) => setQuoteNote(e.target.value)}
                    placeholder="Warranty, delivery, condition…"
                    className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>

                <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3">
                  <SparklesIcon
                    size={15}
                    className="mt-0.5 shrink-0 text-orange-500"
                  />
                  <p className="text-[12px] leading-relaxed text-gray-600">
                    <span className="font-semibold text-ink">
                      Free to send.
                    </span>{" "}
                    {formatNaira(leadFee)} comes out of your wallet only if{" "}
                    {request.buyerName} picks you and messages you.
                    {balance != null && (
                      <>
                        {" "}
                        Balance:{" "}
                        <span className="font-semibold text-ink">
                          {formatNaira(balance)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {!canAfford && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
                    <WalletIcon size={14} className="shrink-0" />
                    <span className="flex-1">
                      You need {formatNaira(leadFee)} available to send an
                      offer.
                    </span>
                    <DashboardLink
                      href={`/${params.id}/wallet`}
                      className="shrink-0 font-semibold underline"
                    >
                      Top up
                    </DashboardLink>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending || !canAfford}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-semibold transition-colors",
                    canAfford
                      ? "cursor-pointer bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-70"
                      : "cursor-not-allowed bg-gray-100 text-gray-400",
                  )}
                >
                  {pending && decisionMutation.variables === "accepted" ? (
                    <LoaderIcon size={16} className="animate-spin" />
                  ) : (
                    <SendIcon size={16} />
                  )}
                  {typedNaira != null
                    ? `Send offer · ${formatNaira(typedNaira * 100)}`
                    : "Accept without a price"}
                </button>
                <button
                  type="button"
                  onClick={() => decisionMutation.mutate("declined")}
                  disabled={pending}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-60"
                >
                  {pending && decisionMutation.variables === "declined" ? (
                    <LoaderIcon size={14} className="animate-spin" />
                  ) : null}
                  Not for me — decline
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
