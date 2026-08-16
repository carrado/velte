"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X } from "lucide-react";

import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerSession } from "@/hooks/useBuyerSession";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import { timeAgo } from "@/lib/timeAgo";
import type { ConversationSummary } from "@/types/buyerConversation";

/* "The chat history is the dashboard" (2026-08-15, AI-agent pivot) — same
   pattern as BuyerHomeActiveRequests right above this on Home: real data,
   nothing shown for an unverified buyer or one with no saved conversations
   yet (an anonymous /chat chat never gets this far — see
   BuyerConversation's own comment on why persistence only starts once a
   buyer session exists). Capped at 5, no "See all" — there's no fuller
   history page to send that to yet; revisit once/if one's built. */
export function BuyerHomeRecentChats() {
  const { buyer } = useBuyerSession();
  const { navigate } = useBuyerNavigation();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["buyer-conversations"],
    queryFn: () =>
      buyerApi.get<{ conversations: ConversationSummary[] }>(
        "/api/buyer-conversations",
      ),
    enabled: !!buyer,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => buyerApi.del(`/api/buyer-conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-conversations"] });
    },
  });

  const conversations = data?.conversations ?? [];
  if (!buyer || conversations.length === 0) return null;

  return (
    <div>
      <h2 className="text-dash-heading font-bold text-gray-900 mb-3">Recent</h2>
      <div className="space-y-2">
        {conversations.slice(0, 5).map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 hover:border-orange-200 hover:shadow-md transition-all"
          >
            <button
              onClick={() => navigate(`/chat?c=${c.id}`)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <MessageCircle size={14} className="text-orange-500" />
              </div>
              <p className="flex-1 min-w-0 text-dash-body font-medium text-gray-900 truncate">
                {c.title}
              </p>
              <span className="shrink-0 text-dash-caption text-gray-400">
                {timeAgo(c.lastMessageAt)}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(c.id);
              }}
              disabled={
                deleteMutation.isPending && deleteMutation.variables === c.id
              }
              aria-label="Remove from recent"
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
