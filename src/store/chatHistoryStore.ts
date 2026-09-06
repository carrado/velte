import { create } from "zustand";

// The one piece of state the chat shell and the search thread both need to
// see (2026-08-26). They live on opposite sides of the Next tree —
// ChatHeader and the sidebar are in chat/layout.tsx, while every turn of
// the conversation lives inside SearchHome on the page — so a clicked
// history row has no prop path to reach the thread by. This is that path,
// kept as small as it can be: a request, and its acknowledgement.
//
// Also owns the sidebar's own open/collapsed state, since the header
// button, the sidebar itself, and a row click all need to move it.
//
// Not persisted, same as buyerStore: reopening the tab should land on the
// live conversation, not silently re-open whatever was last clicked.
interface ChatHistoryStore {
  // TWO independent flags, because a ChatGPT-style sidebar genuinely has
  // two behaviours with opposite defaults, and collapsing them into one
  // would force a viewport check during render (and a hydration mismatch,
  // or a visible flash, to go with it):
  //
  //   isOpen      — the MOBILE slide-over. Default closed: a phone has no
  //                 room to show a list and a conversation at once.
  //   isCollapsed — the DESKTOP column. Default expanded, because that is
  //                 the whole point of a sidebar on a wide screen.
  //
  // Each is read only by the breakpoint it belongs to (mobile classes read
  // isOpen, `lg:` classes read isCollapsed), so both can hold their own
  // deterministic default and neither needs to know the viewport.
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setCollapsed: (isCollapsed: boolean) => void;

  // A conversation the buyer picked, waiting for SearchHome to load it.
  // Cleared by SearchHome the moment it takes it (clearRequest), so the
  // same row clicked twice in a row still fires twice — an id that stayed
  // set would make the second click a no-op.
  requestedConversationId: string | null;
  requestConversation: (conversationId: string) => void;
  clearRequest: () => void;

  // "Start a new chat". A NONCE rather than a boolean, because the action
  // is repeatable and idempotent-looking: a buyer already on a fresh thread
  // who taps it again should still get the drawer closed and the composer
  // reset, and a boolean that was already true would make that a no-op.
  // Null means no request outstanding.
  newChatNonce: number | null;
  requestNewChat: () => void;
  clearNewChatRequest: () => void;
}

export const useChatHistoryStore = create<ChatHistoryStore>()((set) => ({
  isOpen: false,
  setOpen: (isOpen) => set({ isOpen }),
  isCollapsed: false,
  setCollapsed: (isCollapsed) => set({ isCollapsed }),
  requestedConversationId: null,
  requestConversation: (conversationId) =>
    set({ requestedConversationId: conversationId, isOpen: false }),
  clearRequest: () => set({ requestedConversationId: null }),
  newChatNonce: null,
  requestNewChat: () =>
    // Clears any pending open alongside it: the two are contradictory
    // instructions, and the last one tapped is the one the buyer means.
    set({
      newChatNonce: Date.now(),
      requestedConversationId: null,
      isOpen: false,
    }),
  clearNewChatRequest: () => set({ newChatNonce: null }),
}));
