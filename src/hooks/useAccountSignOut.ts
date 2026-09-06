"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { logoutBuyer } from "@/services/buyerAuth";
import { usersApi } from "@/services/users";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { useIsStandalone } from "@/hooks/useIsStandalone";
import { SEARCH_CONVERSATION_ID_STORAGE_KEY } from "@/lib/searchConversation";

// Signing out from the CHAT surface (2026-09-05).
//
// Extracted from ConversationSidebar's own footer, which had the only
// correct implementation of this, so the new account menu in ChatHeader
// could reuse it rather than copy it. Copying was the real risk: the
// localStorage step below is a privacy fix on shared devices, and a second
// copy of it is a second thing to forget when either changes.
//
// SIGNS OUT BOTH SESSIONS when both exist. Velte deliberately runs a vendor
// `auth_token` and a buyer `buyer_auth_token` side by side, so a vendor
// browsing /chat legitimately holds two — but "Log out" in a single account
// menu means one thing to the person clicking it, and leaving half of it
// live would put them straight back on /chat still looking signed in. The
// independence of the two cookies is a fact about the plumbing, not a
// promise to the buyer about what a logout does.
//
// Every step runs regardless of whether the network calls succeeded: the
// cookie may or may not have been cleared upstream, there is nothing useful
// to say about it and nothing worth retrying, and leaving someone looking
// signed-in after they asked not to be is the one outcome worth avoiding.

export function useAccountSignOut(): {
  signOut: () => Promise<void>;
  busy: boolean;
} {
  const clearBuyer = useBuyerStore((s) => s.clearBuyer);
  const queryClient = useQueryClient();
  const isStandalone = useIsStandalone();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);

    // Read at call time, not subscribed: this runs once, and what matters is
    // which sessions exist at the moment the button was pressed.
    const hasBuyer = Boolean(useBuyerStore.getState().buyer);
    const hasVendor = Boolean(useUserStore.getState().user);

    // Independently, and neither is allowed to stop the other — a failing
    // vendor logout must not leave the buyer signed in, or vice versa.
    await Promise.allSettled([
      hasBuyer ? logoutBuyer() : Promise.resolve(),
      hasVendor ? usersApi.logout() : Promise.resolve(),
    ]);

    clearBuyer();
    // Their conversations and notifications are account data — they must
    // not sit in the cache for whoever uses this browser next.
    queryClient.clear();

    // THE IMPORTANT ONE, on a shared phone especially: /chat resumes from a
    // conversation id in localStorage (see chat/layout.tsx's pre-paint
    // check). Left behind, the next person to open Velte on this device
    // silently reopens the previous buyer's thread — vendors, photos, prices
    // and all.
    try {
      localStorage.removeItem(SEARCH_CONVERSATION_ID_STORAGE_KEY);
    } catch {
      /* blocked storage — nothing was stored to leak either */
    }

    // A full navigation, not a router push: SearchHome holds the whole thread
    // in component state, and only a real document load is guaranteed to drop
    // it. replace(), so the signed-in page isn't one back-press away (and
    // can't be served from bfcache without hitting middleware) — the same
    // reasoning the vendor logout in Header.tsx gives.
    //
    // /welcome inside the installed app, /chat in a browser: someone who
    // signs out of the chat is still a buyer, and can keep searching as a
    // guest.
    window.location.replace(isStandalone ? "/welcome" : "/chat");
  };

  return { signOut, busy };
}
