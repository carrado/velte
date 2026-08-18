"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { timeAgo } from "@/lib/timeAgo";
import type { BuyerRequest } from "@/types/buyerRequest";
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  XCircleIcon,
} from "@/components/icons";

/* Vendor's own view of requests THEY were matched to (server already
   filtered — see vendorBuyerRequests.controller.js's listMatchedRequests —
   "do not expose every irrelevant request to every vendor"), not a general
   feed. Each card links to the full detail page, where Accept/Decline
   actually happens (see [requestId]/page.tsx). */
export default function VendorBuyerRequestsPage() {
  const params = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-buyer-requests"],
    queryFn: () =>
      api.get<{ requests: BuyerRequest[] }>("/api/vendor/buyer-requests"),
  });

  const requests = data?.requests ?? [];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Buyer Requests</h1>
      <p className="text-gray-500 text-sm mb-6">
        See what customers near you are looking for.
      </p>

      {isLoading ? (
        <p className="text-gray-400 text-sm text-center py-8">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-gray-600 font-medium mb-1">
            No matching buyer requests yet.
          </p>
          <p className="text-gray-400 text-sm">
            Check back later for new opportunities from customers near you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Link
              key={request.id}
              href={`/${params.id}/buyer-requests/${request.id}`}
              className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-orange-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-semibold text-orange-500">
                  🔥 Buyer Request
                </span>
                {request.myDecision === "accepted" && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 shrink-0">
                    <CheckCircleIcon size={12} /> Accepted
                  </span>
                )}
                {request.myDecision === "declined" && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <XCircleIcon size={12} /> Declined
                  </span>
                )}
              </div>
              <p className="text-gray-900 font-medium mb-3 line-clamp-2">
                {request.description}
              </p>
              <div className="flex items-center gap-4 text-gray-400 text-xs">
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" />{" "}
                  {request.location ? "Near you" : "N/A"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" /> {timeAgo(request.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
