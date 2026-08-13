"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, MapPin, ClipboardList, ShieldCheck } from "lucide-react";

import { buyerApi } from "@/lib/buyer-api-client";
import { ApiError } from "@/lib/api-client";
import { useBuyerStore } from "@/store/buyerStore";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import { RequestStatusBadge } from "@/components/buyer/RequestStatusBadge";
import { BuyerEmptyState } from "@/components/buyer/BuyerEmptyState";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BuyerRequest, BuyerRequestStatus } from "@/types/buyerRequest";

/* Spec §21-23: "What have I asked Velte for, and has anyone responded?" —
   deliberately not the vendor dashboard's equivalent (§21: "Do NOT make the
   buyer dashboard equivalent to the vendor dashboard"), just this list. That
   line is about feature scope, not visual polish — restyled on the same
   card/typography language the vendor dashboard uses throughout. */

// "Closed" folds expired + cancelled into one bucket — RequestStatusBadge
// already renders both identically (a muted gray "Request expired/
// cancelled" pill), so splitting them into two separate filter pills would
// just be a distinction the UI itself doesn't otherwise draw.
type RequestFilter = "all" | "active" | "fulfilled" | "closed";

const FILTERS: { key: RequestFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "closed", label: "Closed" },
];

function matchesFilter(status: BuyerRequestStatus, filter: RequestFilter) {
  if (filter === "all") return true;
  if (filter === "closed")
    return status === "expired" || status === "cancelled";
  return status === filter;
}

export default function BuyerRequestsPage() {
  const buyer = useBuyerStore((s) => s.buyer);
  const { navigate } = useBuyerNavigation();
  const [filter, setFilter] = useState<RequestFilter>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["buyer-requests", "my"],
    queryFn: () =>
      buyerApi.get<{ requests: BuyerRequest[] }>("/api/buyer-requests/my"),
    retry: false,
  });

  const unauthenticated = error instanceof ApiError && error.status === 401;
  const requests = data?.requests ?? [];
  const filteredRequests = requests.filter((r) =>
    matchesFilter(r.status, filter),
  );

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
      <div>
        <h1 className="text-dash-title font-bold text-gray-900 mb-1">
          Hi{buyer?.name ? `, ${buyer.name}` : ""} 👋
        </h1>
        <p className="text-dash-body text-gray-400">
          What are you looking for today?
        </p>
      </div>

      <button
        onClick={() => navigate("/buyer/requests/new")}
        className="flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-semibold rounded-2xl shadow-sm shadow-orange-200 transition-colors cursor-pointer"
      >
        <Plus size={16} /> Post a Request
      </button>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-dash-heading font-bold text-gray-900">
            Your Requests
          </h2>
          {!unauthenticated && !isLoading && requests.length > 0 && (
            <Select
              value={filter}
              onValueChange={(v) => setFilter((v as RequestFilter) ?? "all")}
            >
              <SelectTrigger className="h-7 w-28 px-2.5 text-dash-micro font-semibold bg-white border border-gray-200 rounded-lg text-gray-600 focus-visible:ring-2 focus-visible:ring-orange-300">
                {/* <Select.Value> renders the raw `value` by default (e.g.
                    "all", "closed") — it doesn't automatically resolve to
                    the matching SelectItem's rendered label unless told
                    to. This is the documented fix: a children render
                    function mapping the raw value back to FILTERS' own
                    Capitalized label. */}
                <SelectValue>
                  {(v: RequestFilter) =>
                    FILTERS.find((f) => f.key === v)?.label ?? "All"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FILTERS.map(({ key, label }) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="text-dash-caption"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>

        {unauthenticated ? (
          <BuyerEmptyState
            icon={ShieldCheck}
            title="Verify to see your requests"
            subtitle="Verify your number to view what you've posted and any vendor responses."
            action={
              <Link
                href="/buyer/auth?redirect=/buyer/requests"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-dash-body font-semibold rounded-xl transition-colors"
              >
                Verify now
              </Link>
            }
          />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <BuyerEmptyState
            icon={ClipboardList}
            title="You haven't posted any requests yet"
            subtitle="Tell Velte what you're looking for and let relevant vendors respond."
          />
        ) : (
          <>
            {filteredRequests.length === 0 ? (
              <BuyerEmptyState
                icon={ClipboardList}
                title={`No ${filter === "all" ? "" : filter} requests`}
                subtitle="Try a different filter, or post a new request."
              />
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((request) => (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
