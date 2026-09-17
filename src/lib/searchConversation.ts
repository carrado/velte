import { generateUUID } from "@/lib/uuid";

// Client-side identity for the persisted search conversation (Phase 1,
// docs/velte-ai-search-flow-plan.md). Two localStorage values:
//
// - deviceId: a stable anonymous per-browser UUID, created once and reused
//   forever — it's the OWNERSHIP TOKEN for every conversation this browser
//   creates (staffly-ai-backend matches it against the stored document),
//   so it must never be regenerated while conversations reference it.
// - conversationId: the current conversation, adopted from each turn's
//   final event and cleared when the server declines to rehydrate it
//   (stale/unknown → the next search starts fresh).
//
// Every access is wrapped — localStorage can throw (private browsing,
// storage disabled), and in that case search simply runs stateless, same
// as before Phase 1. Never crash a search over a convenience.

const DEVICE_ID_KEY = "velte_search_device_id";
// Exported for chat/layout.tsx's pre-paint inline script — the one place
// that must read this key OUTSIDE this module (before React even loads) to
// decide whether the hero or the resume loader paints first. Keep them
// importing this constant, never a retyped string.
export const SEARCH_CONVERSATION_ID_STORAGE_KEY =
  "velte_search_conversation_id";
const CONVERSATION_ID_KEY = SEARCH_CONVERSATION_ID_STORAGE_KEY;

export function getSearchDeviceId(): string | null {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = generateUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return null;
  }
}

export function getStoredConversationId(): string | null {
  try {
    return window.localStorage.getItem(CONVERSATION_ID_KEY);
  } catch {
    return null;
  }
}

export function storeConversationId(id: string): void {
  try {
    window.localStorage.setItem(CONVERSATION_ID_KEY, id);
  } catch {
    /* stateless fallback — nothing to do */
  }
}

export function clearStoredConversationId(): void {
  try {
    window.localStorage.removeItem(CONVERSATION_ID_KEY);
  } catch {
    /* nothing to clear */
  }
}
