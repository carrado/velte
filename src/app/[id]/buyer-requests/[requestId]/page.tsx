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
import { walletApi, leadCostForBalance } from "@/services/wallet";
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
  WhatsAppIcon,
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
  // Set the instant Accept succeeds so the WhatsApp CTA appears without
  // waiting on the detail query to refetch — the mutation response already
  // carries the number, no reason to make the vendor wait a round trip
  // longer for the one thing they just paid for.
  // Whether this vendor may chat — NOT the number itself (2026-08-27). The
  // number never reaches the browser now; the CTA points at a server-side
  // redirect that resolves it. See /api/vendor/buyer-requests/[id]/chat.
  const [canChatNow, setCanChatNow] = useState(false);

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
    mutationFn: (decision: BuyerRequestDecision) =>
      api.post<{
        decision: BuyerRequestDecision;
        canChat: boolean;
      }>(`/api/vendor/buyer-requests/${params.requestId}/decision`, {
        decision,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-buyer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setConfirmingAccept(false);
      if (result.decision === "accepted") {
        setCanChatNow(result.canChat);
        toast.success("Accepted — here's their WhatsApp number.");
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
  // Chat is available once this vendor has accepted — either just now
  // (canChatNow) or on an earlier visit (request.canChat, computed
  // server-side from a number the browser never receives).
  //
  // The CTA is a link to our OWN redirect route, deliberately: a wa.me href
  // would put the buyer's number in the DOM, in the hover status bar, and in
  // "copy link address". Accepting buys a way to chat, not a number to keep.
  const canChat = canChatNow || request.canChat;
  const chatHref = canChat
    ? `/api/vendor/buyer-requests/${params.requestId}/chat`
    : null;
  const balanceKobo = wallet?.balanceKobo ?? null;
  // Tiered now, not flat — this previews whatever rate the vendor's OWN
  // current balance actually lands in (see leadCostForBalance's own
  // comment), same rate decideOnRequest charges server-side at Accept
  // time. Falls back to the most expensive tier while the wallet is still
  // loading (balanceKobo null) — a conservative "assume the worst" default
  // for a price PREVIEW, never used to actually block the button (canAfford
  // stays optimistic-true during that same loading window, unchanged).
  const currentLeadCostKobo = leadCostForBalance(balanceKobo ?? 0);
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
          <p className="text-green-700/80 text-sm mb-4">
            Message {request.buyerName} directly on WhatsApp — they&apos;re
            expecting to hear from vendors.
          </p>
          {chatHref ? (
            <a
              href={chatHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors"
            >
              <WhatsAppIcon size={18} /> Chat on WhatsApp
            </a>
          ) : (
            <p className="text-green-700/60 text-sm">
              WhatsApp number unavailable — refresh this page.
            </p>
          )}
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
            {formatNaira(currentLeadCostKobo)} will be deducted from your
            wallet, and you&apos;ll get {request.buyerName}&apos;s WhatsApp
            number right away.
          </p>
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
            Accept to get {request.buyerName}&apos;s WhatsApp number and reach
            out directly — {formatNaira(currentLeadCostKobo)} is deducted from
            your wallet. Declining costs nothing.
          </p>

          {!canAfford && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
              <WalletIcon size={14} className="shrink-0" />
              Your balance ({formatNaira(balanceKobo ?? 0)}) is below the{" "}
              {formatNaira(currentLeadCostKobo)} needed to accept —{" "}
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
              Accept — {formatNaira(currentLeadCostKobo)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
