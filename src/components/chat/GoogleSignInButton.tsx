"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import { buyerApi } from "@/lib/buyer-api-client";
import {
  clearBuyerReferralCode,
  storedBuyerReferralCode,
} from "@/lib/buyerReferralCode";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { cn } from "@/lib/utils";
import type { Buyer } from "@/types/buyer";
import type { User } from "@/types/user";

// Google sign-in for buyers, via Firebase Auth (2026-08-26).
//
// Firebase is the identity provider only. The flow is: popup → Firebase ID
// token → POST it to our own backend, which verifies it against Google's
// public keys and issues the `buyer_auth_token` cookie. The Firebase session
// itself never authorises anything here — the app's own JWT does.
//
// As of 2026-08-27 this is the ONLY thing that issues that cookie: verifying
// a phone stopped creating an account, so "signed in" means exactly "signed
// in with Google", and a buyer's saved conversations follow from it.
//
// signInWithPopup rather than signInWithRedirect: a redirect would unload
// /chat mid-conversation and come back to a fresh page, which is a rough
// thing to do to someone halfway through a search. The trade-off is popup
// blockers — hence the explicit `auth/popup-blocked` message below rather
// than a silent failure.

function messageForFirebaseError(code: string): string | null {
  switch (code) {
    // Both are the buyer deciding not to — closing the popup, or clicking
    // the button again while one is already open. Neither is an error worth
    // showing them; returning null leaves the UI silent.
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
    case "auth/network-request-failed":
      return "Couldn't reach Google. Check your connection and try again.";
    case "auth/unauthorized-domain":
      // A configuration fault, not the buyer's — worded so whoever sees it
      // in testing knows where to look.
      return "This domain isn't authorised for sign-in yet.";
    default:
      return "Couldn't sign you in. Please try again.";
  }
}

export function GoogleSignInButton({
  onSignedIn,
  variant = "full",
}: {
  /** Fired after the session cookie is set and the buyer is in the store —
   *  used by the caller to close whatever prompted the sign-in. */
  onSignedIn?: (buyer: Buyer) => void;
  /** "full" (default, unchanged) stretches to its container's width, for
   *  the empty-state/quota-gate cards this originally shipped for. "compact"
   *  (2026-09-22, explicit request) sizes itself to its content instead —
   *  same inline-pill proportions as CreditsButton's "Top up credits"
   *  elsewhere on /chat (px-4/h-10/rounded-full/text-sm) — for a spot like
   *  the Buyer-Request chat-body sign-in prompt, where a button stretched to
   *  the full width of the thread read as far too heavy for a single tap
   *  sitting under a couple of sentences of reply text. Google's own
   *  required mark/colors are untouched either way — only the sizing
   *  changes. */
  variant?: "full" | "compact";
}) {
  const setBuyer = useBuyerStore((s) => s.setBuyer);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isFirebaseConfigured();

  const handleClick = useCallback(async () => {
    if (busy) return;
    const auth = firebaseAuth();
    if (!auth) {
      setError("Google sign-in isn't configured.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      // Always show the chooser. Without it a browser signed into several
      // Google accounts silently reuses the last one, which on a shared
      // phone hands someone else's history to whoever tapped the button.
      provider.setCustomParameters({ prompt: "select_account" });

      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();

      const { buyer } = await buyerApi.post<{ buyer: Buyer }>(
        "/api/buyer-auth/firebase",
        // The referral code, if they arrived through someone's link — see
        // lib/buyerReferralCode.ts for why it comes from storage rather than
        // the URL. Undefined for everyone else, which the backend reads as
        // "not referred" rather than as an error.
        { idToken, referralCode: storedBuyerReferralCode() },
      );
      // Only once the account actually exists. Clearing before this would
      // lose the referrer their bonus on any sign-in that failed partway.
      clearBuyerReferralCode();
      setBuyer(buyer);

      // The backend pairs cookies at this sign-in: a verified vendor with the
      // same email gets `auth_token` set alongside the buyer one, and a stale
      // unrelated vendor cookie is cleared. Its response only carries the
      // buyer, though, so without this re-read the vendor store stays as it
      // was until the next full load — a linked vendor saw their Google
      // name and avatar instead of their store (ChatHeader and the sidebar
      // both prefer the vendor identity when it's present). Same route
      // IdentitySessionSync uses on mount.
      //
      // The buyer is re-taken from this read too: on the sign-in that FIRST
      // links the accounts, the response's buyer was loaded before
      // `linkedVendorId` was written, and ChatHeader treats a buyer whose
      // link doesn't name the current vendor as a stranger's session —
      // clearing it and resetting the chat.
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "same-origin",
        });
        if (res.ok) {
          const session = (await res.json()) as {
            vendor: User | null;
            buyer: Buyer | null;
          };
          if (session.buyer) setBuyer(session.buyer);
          if (session.vendor) useUserStore.getState().setUser(session.vendor);
          else useUserStore.getState().clearUser();
        }
      } catch {
        /* best-effort — the next page load's IdentitySessionSync corrects it */
      }

      // No claim step: conversations are only ever created for a signed-in
      // buyer (2026-08-27), so there are never unowned threads on this
      // device to adopt. Anything they searched before signing in was never
      // persisted at all — which is the point of that rule, not a gap in
      // this one.
      //
      // The sidebar must still refetch: it was showing the signed-out
      // prompt a moment ago.
      void queryClient.invalidateQueries({
        queryKey: ["buyer", "conversations"],
      });
      void queryClient.invalidateQueries({ queryKey: ["buyer", "me"] });
      onSignedIn?.(buyer);
    } catch (err) {
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      // A Firebase error carries a code; anything else here came from our
      // own POST (ApiError), whose message is already buyer-facing.
      const message = code
        ? messageForFirebaseError(code)
        : err instanceof Error
          ? err.message
          : "Couldn't sign you in.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [busy, setBuyer, queryClient, onSignedIn]);

  if (!configured) {
    return (
      <p className="text-xs text-gray-400 text-center max-w-[240px]">
        Google sign-in isn&apos;t set up on this environment yet.
      </p>
    );
  }

  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        compact ? "items-start" : "items-center w-full",
      )}
    >
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        className={cn(
          "flex items-center justify-center gap-2.5 rounded-full border border-gray-200 bg-surface hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer",
          compact ? "h-10 px-4" : "h-11 px-4 w-full",
        )}
      >
        {/* Google's mark, inline rather than a remote asset — their branding
            guidelines require the official four-colour "G" on a sign-in
            button, and an <img> to a CDN would be one more thing to fail. */}
        <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        <span className="text-sm font-medium text-ink">
          {busy ? "Signing you in…" : "Continue with Google"}
        </span>
      </button>
      {error && !busy && (
        <p
          className={cn(
            "text-xs text-red-600",
            compact ? "text-left" : "text-center max-w-[240px]",
          )}
        >
          {error}
        </p>
      )}
    </div>
  );
}
