"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import { api } from "@/lib/api-client";
import { timeAgo } from "@/lib/timeAgo";
import type { BuyerRequest } from "@/types/buyerRequest";

/* Spec §16-17: vendor's own view of requests THEY were matched to (server
   already filtered — see vendorBuyerRequests.controller.js's
   listMatchedRequests — "do not expose every irrelevant request to every
   vendor"), not a general feed. */
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
                {request.alreadyResponded && (
                  <span className="text-xs text-gray-400 shrink-0">
                    Responded
                  </span>
                )}
              </div>
              <p className="text-gray-900 font-medium mb-3 line-clamp-2">
                {request.description}
              </p>
              <div className="flex items-center gap-4 text-gray-400 text-xs">
                {(request.area || request.state) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{" "}
                    {request.area || request.state}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeAgo(request.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
