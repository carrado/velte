import { create } from "zustand";

// Separate from userStore: this fires on a 423 response from ANY
// authenticated request (see api-client.ts's request()), not just
// login — an already-logged-in vendor can be blocked mid-session, and this
// is how that reaches the globally-mounted BlockedAccountModal.
interface BlockedStore {
  message: string | null;
  setBlocked: (message: string) => void;
  clear: () => void;
}

export const useBlockedStore = create<BlockedStore>()((set) => ({
  message: null,
  setBlocked: (message) => set({ message }),
  clear: () => set({ message: null }),
}));
