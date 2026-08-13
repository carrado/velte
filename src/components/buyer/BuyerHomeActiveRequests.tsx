"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";

import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import { RequestStatusBadge } from "@/components/buyer/RequestStatusBadge";
import type { BuyerRequest } from "@/types/buyerRequest";

/* Home's "what's already in flight" section — real data, not filler,
 * shares the Requests tab's own query key so it's free (served from
 * cache) whenever that tab's already been visited. Renders nothing for an
 * unverified buyer or one with no active requests — Home stays a clean
 * search-first surface rather than showing an empty-state card for
 * something that was never started. */
export function BuyerHomeActiveRequests() {
  const { buyer } = useBuyerSession();
  const { navigate } = useBuyerNavigation();

  const { data } = useQuery({
    queryKey: ["buyer-requests", "my"],
    queryFn: () =>
      buyerApi.get<{ requests: BuyerRequest[] }>("/api/buyer-requests/my"),
    enabled: !!buyer,
    retry: false,
  });

  const active = (data?.requests ?? []).filter((r) => r.status === "active");
  if (!buyer || active.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-dash-heading font-bold text-gray-900">
          Your active requests
        </h2>
        <button
          onClick={() => navigate("/buyer/requests")}
          className="text-dash-caption font-semibold text-orange-600 cursor-pointer"
        >
          See all
        </button>
      </div>
      <div className="space-y-3">
        {active.slice(0, 3).map((request) => (
          <button
            key={request.id}
            onClick={() => navigate(`/buyer/requests/${request.id}`)}
            className="block w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-dash-body font-medium text-gray-900 line-clamp-2 mb-2">
              {request.description}
            </p>
            {(request.area || request.state) && (
              <p className="inline-flex items-center gap-1 text-dash-caption text-gray-400 mb-2.5">
                <MapPin size={11} /> {request.area || request.state}
              </p>
            )}
            <RequestStatusBadge request={request} />
          </button>
        ))}
      </div>
    </div>
  );
}
