"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { api } from "@/lib/api-client";
import { getInitial } from "@/lib/initials";
import { timeAgo } from "@/lib/timeAgo";
import type { VendorFollower } from "@/types/followers";

/* Read-only, on purpose — a vendor can see WHO follows their store (real
   social proof, a reason to keep their storefront strong), but there's
   deliberately no chat/DM/phone anywhere on this page. The backend
   (getMyFollowers) never even sends phone down; this page just doesn't
   pretend there's a way to reach these buyers outside the flows THEY
   start themselves (a request response, or "Chat" on one of your own
   listings). See buyerSaved.controller.js's toggleSaved for the other
   half — this is what a "New follower" notification tap lands on. */
export default function VendorFollowersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-followers"],
    queryFn: () =>
      api.get<{ followers: VendorFollower[] }>("/api/vendor/followers"),
  });

  const followers = data?.followers ?? [];

  return (
    <div className="w-full space-y-4">
      <div className="px-4 md:px-0">
        <h1 className="text-dash-title font-bold text-[#023337] mb-1">
          Followers
        </h1>
        <p className="text-dash-body text-gray-500">
          Buyers who follow your store on Velte.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white border border-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : followers.length === 0 ? (
        <div className="bg-white border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-4">
            <Users size={22} />
          </div>
          <p className="text-dash-heading font-semibold text-gray-900 mb-1">
            No followers yet
          </p>
          <p className="text-dash-body text-gray-400 max-w-xs mx-auto">
            When a buyer follows your store, they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 shadow-sm divide-y divide-gray-100">
          {followers.map((follower, i) => (
            <div
              key={`${follower.username ?? follower.name ?? "follower"}-${i}`}
              className="flex items-center gap-3.5 p-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shrink-0">
                {getInitial(follower.name ?? follower.username ?? "") || (
                  <Users size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-dash-body font-semibold text-gray-900 truncate">
                  {follower.name || "A Velte buyer"}
                </p>
                {follower.username && (
                  <p className="text-dash-caption text-gray-400 truncate">
                    @{follower.username}
                  </p>
                )}
              </div>
              <p className="text-dash-caption text-gray-400 shrink-0">
                Followed {timeAgo(follower.followedAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
