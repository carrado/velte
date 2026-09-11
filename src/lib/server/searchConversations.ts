import { aiSearchData } from "@/lib/server/aiSearchBackend";
import type {
  ConversationTask,
  SearchConversationList,
  SearchHistoryTurn,
  StoredBuyerLocation,
  StoredConversation,
  StoredSearchTurn,
} from "@/types/search";

// What the caller knows about location for this turn (Phase 5) — merged
// server-side onto whatever the conversation already has, never
// overwriting a settled position with an empty one. Omit entirely when
// nothing about location changed.
export interface BuyerLocationUpdate {
  lat?: number;
  lng?: number;
  placeName?: string;
  declined?: boolean;
}

// Server-side client for staffly-ai-backend's persisted-conversation
// endpoints (Phase 1, docs/velte-ai-search-flow-plan.md). Every function
// here is deliberately failure-tolerant at the CALL SITE, not in here —
// /api/search/route.ts wraps each call in its own try/catch so a
// persistence outage degrades the turn to the old stateless behavior
// instead of failing the search.

export interface EnsuredSearchConversation {
  conversationId: string;
  isNew: boolean;
  history: SearchHistoryTurn[];
  // The conversation's stored status-phrase memory (most-recent-last,
  // capped server-side) — route.ts merges this under the client-resent
  // copy so repeat avoidance survives a refresh.
  recentStatuses: string[];
  // The conversation's settled location, so the route can tell whether
  // location is already resolved without waiting on the client's own copy.
  buyerLocation: StoredBuyerLocation | null;
  // The goal sheet as it stood BEFORE this turn — the route applies its
  // own two locks (see applies-check in route.ts) before using any of it.
  task: ConversationTask | null;
  /** The tool this conversation is still in the middle of, if any — the
   *  route falls back to this whenever the message itself arrives without
   *  one, which is every follow-up after the first (the composer clears its
   *  badge on send). Null on a new chat, and dropped whenever the buyer
   *  moves to an unrelated request. See the backend model's own comment. */
  activeTool: string | null;
}

// What the route tells the backend about this turn's request, so the sheet
// can accumulate or reset. `startsFreshRequest` is the route's own already-
// vetoed boundary decision, not the raw classifier output.
export interface SearchGoalUpdate {
  startsFreshRequest: boolean;
  itemTerm?: string | null;
  maxBudgetNaira?: number | null;
  attributes?: string[];
}

/**
 * Load-or-create the conversation for this turn. A missing, foreign, or
 * stale conversationId comes back as a fresh conversation (isNew), never an
 * error — the client adopts the returned id from the final event.
 */
export async function ensureSearchConversation(params: {
  deviceId: string;
  conversationId: string | null;
  buyerId: string | null;
  buyerLocation?: BuyerLocationUpdate;
}): Promise<EnsuredSearchConversation> {
  return aiSearchData<EnsuredSearchConversation>(
    "/search/conversations/ensure",
    {
      method: "POST",
      body: {
        deviceId: params.deviceId,
        conversationId: params.conversationId ?? undefined,
        buyerId: params.buyerId ?? undefined,
        buyerLocation: params.buyerLocation,
      },
    },
  );
}

/** Append one completed turn's snapshot; also advances the task server-side.
 * `recentStatuses` (optional — the client-persist path doesn't track them)
 * replaces the conversation's stored status-phrase memory wholesale. */
export async function appendSearchTurn(params: {
  conversationId: string;
  deviceId: string;
  buyerId: string | null;
  turn: StoredSearchTurn;
  recentStatuses?: string[];
  buyerLocation?: BuyerLocationUpdate;
  goal?: SearchGoalUpdate;
  /** The session's active tool as of the END of this turn — a string to keep
   *  it in play, `null` to drop it. `undefined` means "this caller doesn't
   *  manage it" (the client-resolved background-item path) and leaves
   *  whatever is stored untouched. */
  activeTool?: string | null;
}): Promise<void> {
  await aiSearchData(
    `/search/conversations/${encodeURIComponent(params.conversationId)}/turns`,
    {
      method: "POST",
      body: {
        deviceId: params.deviceId,
        buyerId: params.buyerId ?? undefined,
        turn: params.turn,
        recentStatuses: params.recentStatuses,
        buyerLocation: params.buyerLocation,
        goal: params.goal,
        activeTool: params.activeTool,
      },
    },
  );
}

/** Flip the shopping task to handed_off — the buyer clicked a WhatsApp CTA.
 * Best-effort by contract (beacon-fired); the caller ignores failures. */
export async function markSearchConversationHandoff(params: {
  conversationId: string;
  deviceId: string;
}): Promise<void> {
  await aiSearchData(
    `/search/conversations/${encodeURIComponent(params.conversationId)}/handoff`,
    {
      method: "POST",
      body: { deviceId: params.deviceId },
    },
  );
}

/** Full snapshots for the client's refresh rehydrate — 404s when stale,
 *  which is how the client learns to drop a finished thread's id and start
 *  clean. `buyerId` widens ownership so a signed-in buyer can open their own
 *  conversation from a browser that didn't create it; `includeStale` is for
 *  a thread deliberately picked from the history list, where an old thread
 *  is the point rather than a problem. */
export async function getSearchConversation(params: {
  conversationId: string;
  deviceId: string;
  buyerId?: string | null;
  includeStale?: boolean;
}): Promise<StoredConversation> {
  const query = new URLSearchParams({ deviceId: params.deviceId });
  if (params.buyerId) query.set("buyerId", params.buyerId);
  if (params.includeStale) query.set("includeStale", "true");
  return aiSearchData<StoredConversation>(
    `/search/conversations/${encodeURIComponent(params.conversationId)}?${query.toString()}`,
  );
}

/** Deletes one conversation from the signed-in buyer's history for good
 *  (2026-09-09) — the sidebar's own delete action. buyerId-only ownership,
 *  same as the list this is deleting a row out of; see the backend
 *  controller's own comment for why deviceId ownership doesn't apply here. */
export async function deleteSearchConversation(params: {
  conversationId: string;
  buyerId: string;
}): Promise<void> {
  const query = new URLSearchParams({ buyerId: params.buyerId });
  await aiSearchData(
    `/search/conversations/${encodeURIComponent(params.conversationId)}?${query.toString()}`,
    { method: "DELETE" },
  );
}

/** The chat-history list for a signed-in buyer, newest first. Titles and
 *  counts only — never turns, which carry whole result sets (see the
 *  backend's own listConversations comment). */
export async function listSearchConversations(params: {
  buyerId: string;
  limit?: number;
  before?: string | null;
}): Promise<SearchConversationList> {
  const query = new URLSearchParams({ buyerId: params.buyerId });
  if (params.limit) query.set("limit", String(params.limit));
  if (params.before) query.set("before", params.before);
  return aiSearchData<SearchConversationList>(
    `/search/conversations?${query.toString()}`,
  );
}
