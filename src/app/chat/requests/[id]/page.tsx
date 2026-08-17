"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Clock, ArrowLeft, MessageSquare, Store } from "lucide-react";

import { buyerApi } from "@/lib/buyer-api-client";
import { RequestStatusBadge } from "@/components/buyer/RequestStatusBadge";
import { BuyerEmptyState } from "@/components/buyer/BuyerEmptyState";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { reportLead } from "@/lib/reportLead";
import { timeAgo } from "@/lib/timeAgo";
import { getInitial } from "@/lib/initials";
import type {
  BuyerRequest,
  BuyerRequestResponseItem,
} from "@/types/buyerRequest";

/* Moved from buyer/(dashboard)/requests/[id]/page.tsx (2026-08-17,
   buyer-dashboard removal) into the /chat shell — see chat/layout.tsx.
   Also the destination of BuyerRequestOfferWidget's own "View request"
   link (see that file). Navigation swapped from BuyerNavigationProgressContext
   (retired alongside the rest of the buyer dashboard chrome) to a plain
   next/link. */

// Pre-filled message per the design converged on: the vendor's OWN response
// already carries context (they wrote it), this is the buyer's side of that
// same conversation starting — quoting the request keeps it self-explanatory
// regardless of which message either party actually reads first.
function buildWhatsAppLink(
  whatsapp: string,
  requestDescription: string,
): string {
  const text = encodeURIComponent(
    `Hi! I saw your response to my Velte request: "${requestDescription}"`,
  );
  return `https://wa.me/${whatsapp}?text=${text}`;
}

export default function ChatRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const id = params.id;

  const { data: requestData, isLoading: requestLoading } = useQuery({
    queryKey: ["buyer-requests", id],
    queryFn: () =>
      buyerApi.get<{ request: BuyerRequest }>(`/api/buyer-requests/${id}`),
  });

  const { data: responsesData, isLoading: responsesLoading } = useQuery({
    queryKey: ["buyer-requests", id, "responses"],
    queryFn: () =>
      buyerApi.get<{ responses: BuyerRequestResponseItem[] }>(
        `/api/buyer-requests/${id}/responses`,
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      buyerApi.patch<{ request: BuyerRequest }>(
        `/api/buyer-requests/${id}/cancel`,
      ),
    onSuccess: ({ request }) => {
      queryClient.setQueryData(["buyer-requests", id], { request });
      toast.success("Request cancelled.");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Couldn't cancel this request."),
  });

  const request = requestData?.request;
  const responses = responsesData?.responses ?? [];

  if (requestLoading || !request) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
          <div className="h-44 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse" />
          <div className="h-24 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-5">
        <Link
          href="/chat/requests"
          className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-dash-body transition-colors"
        >
          <ArrowLeft size={14} /> Back to requests
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <p className="text-dash-body font-medium text-gray-900 mb-3">
            {request.description}
          </p>
          {request.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={optimizedImageUrl(request.imageUrl)}
              alt="Request photo"
              className="w-full max-w-xs rounded-xl mb-3 object-cover border border-gray-100"
            />
          )}
          <div className="flex items-center gap-4 text-dash-caption text-gray-400 mb-3">
            {(request.area || request.state) && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {request.area || request.state}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> Posted {timeAgo(request.createdAt)}
            </span>
          </div>
          <RequestStatusBadge request={request} />

          {request.status === "active" && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="mt-4 w-full px-4 py-2.5 text-dash-body font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel Request"}
            </button>
          )}
        </div>

        <div>
          <h2 className="text-dash-heading font-bold text-gray-900 mb-3">
            {responses.length > 0
              ? `${responses.length} Vendor Response${responses.length === 1 ? "" : "s"}`
              : "Responses"}
          </h2>

          {responsesLoading ? (
            <div className="h-20 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse" />
          ) : responses.length === 0 ? (
            <BuyerEmptyState
              icon={MessageSquare}
              title="No vendors have responded yet"
              subtitle="We'll text you and notify you in-app the moment someone does."
            />
          ) : (
            <div className="space-y-3">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-dash-secondary font-bold shrink-0">
                      {getInitial(response.vendor?.name ?? "") || (
                        <Store size={13} />
                      )}
                    </div>
                    <p className="text-dash-body font-semibold text-gray-900">
                      {response.vendor?.name ?? "A vendor"}
                    </p>
                  </div>
                  <p className="text-dash-body text-gray-600 mb-3.5">
                    {response.vendorResponse}
                  </p>
                  {response.vendor?.whatsapp && (
                    <a
                      href={buildWhatsAppLink(
                        response.vendor.whatsapp,
                        request.description,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        // "Chat on WhatsApp" billing click — reuses the EXISTING
                        // chargeLead endpoint (source: "buyer_request"), never a
                        // new billing path. See reportLead.ts's own comment on
                        // why buyerId here still means the anonymous per-browser
                        // id, not this authenticated buyer's real id.
                        reportLead(
                          response.vendorId,
                          undefined,
                          "buyer_request",
                          request.id,
                        )
                      }
                      className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-dash-body font-semibold px-4 py-2.5 rounded-xl transition-colors"
                    >
                      Chat on WhatsApp
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
