"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { formatNaira, cn } from "@/lib/utils";
import { timeAgo } from "@/lib/timeAgo";
import { walletApi, leadCost } from "@/services/wallet";
import type { BuyerRequest, BuyerRequestDecision } from "@/types/buyerRequest";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ImageIcon,
  LoaderIcon,
  MapPinIcon,
  UserRoundIcon,
  WalletIcon,
  XCircleIcon,
} from "@/components/icons";

/* Full detail + Accept/Decline for a single matched Buyer Request
   (2026-08-18 redesign). Accepting is the entire monetization moment: it
   charges the vendor's wallet immediately and reveals the buyer's WhatsApp
   number right there — no further round trip, no waiting on the buyer to
   do anything (they have no account/inbox to act from). Declining costs
   nothing and reveals nothing. */
export default function VendorBuyerRequestDetailPage() {
  const params = useParams<{ id: string; requestId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmingAccept, setConfirmingAccept] = useState(false);
  // The optional quote typed on the confirm step (2026-09-03). Strings, not
  // numbers, because these are controlled inputs and a half-typed "4" must
  // stay "4" rather than becoming 4 and back. Parsed once, on submit.
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteDays, setQuoteDays] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-buyer-requests", params.requestId],
    queryFn: () =>
      api.get<{ request: BuyerRequest }>(
        `/api/vendor/buyer-requests/${params.requestId}`,
      ),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: walletApi.getWallet,
  });

  const decisionMutation = useMutation({
    mutationFn: (decision: BuyerRequestDecision) => {
      // Naira in the box, kobo on the wire — every money field in both repos
      // is kobo, and this is the one place a vendor types a human amount.
      // An unparseable or empty box sends null, which is a permitted answer:
      // accepting without quoting stays exactly as it was.
      const priceNaira = Number(quotePrice.replace(/[^0-9.]/g, ""));
      const days = Number(quoteDays.replace(/[^0-9]/g, ""));
      const quote =
        decision === "accepted"
          ? {
              priceKobo:
                Number.isFinite(priceNaira) && priceNaira > 0
                  ? Math.round(priceNaira * 100)
                  : null,
              leadTimeDays:
                quoteDays.trim() !== "" && Number.isInteger(days) && days >= 0
                  ? days
                  : null,
              note: quoteNote.trim() || null,
            }
          : undefined;
      return api.post<{
        decision: BuyerRequestDecision;
      }>(`/api/vendor/buyer-requests/${params.requestId}/decision`, {
        decision,
        ...(quote ? { quote } : {}),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-buyer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setConfirmingAccept(false);
      if (result.decision === "accepted") {
        toast.success("Accepted — your price is now with the buyer.");
      } else {
        toast.success("Declined.");
        router.push(`/${params.id}/buyer-requests`);
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : "Something went wrong.";
      toast.error(message);
      setConfirmingAccept(false);
    },
  });

  const request = data?.request;

  if (isLoading || !request) {
    return <p className="text-gray-400 text-sm text-center py-8">Loading...</p>;
  }

  const decision = request.myDecision;
  const accepted = decision === "accepted";
  const balanceKobo = wallet?.balanceKobo ?? null;
  // Flat for everyone since 2026-09-03, and no longer charged HERE at all:
  // accepting is free, and the fee lands only if the buyer actually messages
  // this vendor (see services/wallet.ts, and /api/chat where it is billed).
  //
  // The wallet check survives the move with a different meaning. It is no
  // longer "you are about to be charged this" but "you must be able to cover
  // one lead in order to accept" — the gate that keeps the fee collectable
  // later, when the person clicking is the buyer rather than the vendor.
  // Still optimistic-true while the wallet loads (balanceKobo null), so a
  // slow request never reads as an empty wallet.
  const currentLeadCostKobo = leadCost();
  const canAfford = balanceKobo === null || balanceKobo >= currentLeadCostKobo;
  const mapUrl = request.location
    ? `https://www.google.com/maps?q=${request.location.coordinates[1]},${request.location.coordinates[0]}`
    : null;

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <button
        onClick={() => router.push(`/${params.id}/buyer-requests`)}
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm mb-4 cursor-pointer transition-colors"
      >
        <ArrowLeftIcon size={15} /> Back to Buyer Requests
      </button>

      {/* ── Request card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
        {request.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizedImageUrl(request.imageUrl)}
            alt="Request photo"
            className="w-full max-h-72 object-cover"
          />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500">
              🔥 Buyer Request
            </span>
            {request.status !== "active" && (
              <span className="text-xs font-medium text-gray-400 capitalize bg-gray-100 rounded-full px-2.5 py-1">
                {request.status}
              </span>
            )}
          </div>

          <p className="text-gray-900 text-base leading-relaxed mb-4">
            {request.description}
          </p>

          {request.budgetKobo != null ? (
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-100 px-3.5 py-2.5 mb-4">
              <WalletIcon size={15} className="text-orange-500 shrink-0" />
              <span className="text-sm text-gray-600">
                Budget:{" "}
                <span className="font-semibold text-[#023337]">
                  {formatNaira(request.budgetKobo)}
                </span>
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-4">
              No budget given — worth asking before you quote.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-gray-500 text-xs border-t border-gray-100 pt-4">
            <span className="inline-flex items-center gap-1.5">
              <UserRoundIcon size={14} className="text-gray-400" />
              {request.buyerName}
            </span>
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-medium"
              >
                <MapPinIcon size={14} /> View location
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon size={14} className="text-gray-400" /> Location: N/A
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon size={14} className="text-gray-400" />
              Posted {timeAgo(request.createdAt)}
            </span>
            {!request.imageUrl && (
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <ImageIcon size={14} /> No photo attached
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Decision panel ───────────────────────────────────────────── */}
      {accepted ? (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
            <CheckCircleIcon size={18} /> You accepted this request
          </div>
          <p className="text-green-700/80 text-sm">
            {request.buyerName} can see your price alongside the other
            businesses that answered. They&apos;ll message you on WhatsApp if
            they choose yours — that&apos;s the only point you&apos;re charged.
          </p>
        </div>
      ) : decision === "declined" ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-2 text-gray-500">
          <XCircleIcon size={18} /> You declined this request.
        </div>
      ) : request.status !== "active" ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center text-gray-500 text-sm">
          This request is no longer active.
        </div>
      ) : confirmingAccept ? (
        <div className="bg-white rounded-2xl border border-orange-200 p-5">
          <p className="text-gray-900 font-medium mb-1">Accept this request?</p>
          <p className="text-gray-500 text-sm mb-4">
            Accepting is free. {request.buyerName} sees your price and messages
            you if they choose — only then is {formatNaira(currentLeadCostKobo)}{" "}
            deducted from your wallet.
          </p>

          {/* The quote (2026-09-03). OPTIONAL, and labelled as such, because
              making it mandatory would change what Accept means for every
              vendor already using it — and a vendor forced to name a number
              will invent a placeholder, which is worse for the buyer than no
              quote at all. What it buys the vendor is stated plainly: this
              request went to several businesses, and a quote is what puts
              them on a comparison rather than in a list of names. */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <p className="text-sm font-medium text-gray-900">
              Add your price{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">
              {request.buyerName} sent this to several businesses. Quoting puts
              you on their comparison instead of just their contact list.
            </p>
            <div className="flex gap-2.5">
              <label className="flex-1">
                <span className="block text-xs text-gray-500 mb-1">
                  Your price (₦)
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  placeholder="450,000"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                />
              </label>
              <label className="w-28">
                <span className="block text-xs text-gray-500 mb-1">
                  Ready in (days)
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quoteDays}
                  onChange={(e) => setQuoteDays(e.target.value)}
                  placeholder="2"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                />
              </label>
            </div>
            <label className="block mt-2.5">
              <span className="block text-xs text-gray-500 mb-1">
                Anything else? (warranty, delivery…)
              </span>
              <input
                type="text"
                maxLength={200}
                value={quoteNote}
                onChange={(e) => setQuoteNote(e.target.value)}
                placeholder="1 year warranty, free delivery in Enugu"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              />
            </label>
          </div>

          <div className="flex gap-2.5">
            <Button
              onClick={() => setConfirmingAccept(false)}
              variant="outline"
              disabled={decisionMutation.isPending}
              className="flex-1 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={() => decisionMutation.mutate("accepted")}
              disabled={decisionMutation.isPending}
              className="flex-1 bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold"
            >
              {decisionMutation.isPending ? (
                <LoaderIcon size={15} className="animate-spin" />
              ) : (
                "Confirm & Accept"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-gray-900 font-medium mb-1">Interested?</p>
          <p className="text-gray-500 text-sm mb-4">
            Accept to put your price in front of {request.buyerName}. It costs
            nothing to accept or decline — {formatNaira(currentLeadCostKobo)} is
            deducted only if they message you.
          </p>

          {!canAfford && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
              <WalletIcon size={14} className="shrink-0" />
              Your balance ({formatNaira(balanceKobo ?? 0)}) is below the{" "}
              {formatNaira(currentLeadCostKobo)} you need available to accept —{" "}
              <a
                href={`/${params.id}/wallet`}
                className="underline font-medium"
              >
                top up
              </a>{" "}
              first.
            </div>
          )}

          <div className="flex gap-2.5">
            <Button
              onClick={() => decisionMutation.mutate("declined")}
              variant="outline"
              disabled={decisionMutation.isPending}
              className="flex-1 cursor-pointer"
            >
              {decisionMutation.isPending &&
              decisionMutation.variables === "declined" ? (
                <LoaderIcon size={15} className="animate-spin" />
              ) : (
                "Decline"
              )}
            </Button>
            <Button
              onClick={() => setConfirmingAccept(true)}
              disabled={decisionMutation.isPending || !canAfford}
              className={cn(
                "flex-1 font-semibold cursor-pointer",
                canAfford
                  ? "bg-orange-500 hover:bg-orange-400 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100",
              )}
            >
              Accept
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
