// A persisted /chat chat thread — see velte-backend's BuyerConversation
// model for the full "why" (lightweight {role,content} pairs, not a replay
// log of search results). Only ever exists for an identified buyer.

export interface ConversationTurnRecord {
  role: "user" | "assistant";
  content: string;
}

// The "Recent" list's own shape — no `turns`, kept light on purpose (see
// listConversations in the backend controller).
export interface ConversationSummary {
  id: string;
  title: string;
  lastMessageAt: string;
  createdAt?: string;
}

// The full shape returned when resuming one specific conversation.
export interface BuyerConversation extends ConversationSummary {
  turns: ConversationTurnRecord[];
}
