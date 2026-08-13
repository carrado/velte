"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Clock } from "lucide-react";

import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { timeAgo } from "@/lib/timeAgo";
import type {
  BuyerRequest,
  BuyerRequestResponseItem,
} from "@/types/buyerRequest";

/* Spec §18-20: full description + photo + location + posted-time, then a
   plain textarea response — deliberately NO price/delivery/bidding fields
   for V1 (§18's own instruction). Responding does not charge the vendor's
   wallet (see §62.1/§27) — billing happens later, when the buyer reads this
   in-app and chooses "Chat on WhatsApp" themselves. */
export default function VendorBuyerRequestDetailPage() {
  const params = useParams<{ id: string; requestId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-buyer-requests", params.requestId],
    queryFn: () =>
      api.get<{ request: BuyerRequest }>(
        `/api/vendor/buyer-requests/${params.requestId}`,
      ),
  });

  const respondMutation = useMutation({
    mutationFn: (vendorResponse: string) =>
      api.post<{ response: BuyerRequestResponseItem }>(
        `/api/vendor/buyer-requests/${params.requestId}/respond`,
        { vendorResponse },
      ),
    onSuccess: () => {
      toast.success("Response sent.");
      queryClient.invalidateQueries({ queryKey: ["vendor-buyer-requests"] });
      router.push(`/${params.id}/buyer-requests`);
    },
    onError: (error: unknown) => {
      // Spec §20's exact copy — the backend already returns this message on
      // a duplicate-response 409, this just surfaces it as-is.
      const message =
        error instanceof ApiError
          ? error.message
          : "Failed to send your response.";
      toast.error(message);
    },
  });

  const request = data?.request;

  if (isLoading || !request) {
    return <p className="text-gray-400 text-sm text-center py-8">Loading...</p>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button
        onClick={() => router.push(`/${params.id}/buyer-requests`)}
        className="text-gray-400 text-sm mb-4 cursor-pointer"
      >
        ← Back to Buyer Requests
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Buyer Request
        </h2>
        <p className="text-gray-900 font-medium mb-3">{request.description}</p>

        {request.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizedImageUrl(request.imageUrl)}
            alt="Request photo"
            className="w-full max-w-xs rounded-xl mb-3 object-cover"
          />
        )}

        <div className="flex items-center gap-4 text-gray-400 text-xs">
          {(request.area || request.state) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {request.area || request.state}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Posted {timeAgo(request.createdAt)}
          </span>
        </div>
      </div>

      {request.alreadyResponded ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center text-gray-600">
          You&apos;ve already responded to this request.
        </div>
      ) : request.status !== "active" ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center text-gray-600">
          This request is no longer active.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Respond to Buyer
          </h2>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell the buyer what you can offer..."
            rows={4}
            maxLength={500}
            className="mb-3"
          />
          <Button
            onClick={() => respondMutation.mutate(message.trim())}
            disabled={!message.trim() || respondMutation.isPending}
            className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold"
          >
            {respondMutation.isPending ? "Sending..." : "Send Response"}
          </Button>
        </div>
      )}
    </div>
  );
}
