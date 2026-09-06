"use client";

import { useEffect } from "react";

import { usersApi } from "@/services/users";
import { useUserStore } from "@/store/userStore";

// Hydrates the VENDOR session on /chat (2026-08-31).
//
// `userStore` is not persisted, and until now nothing under /chat ever filled
// it — only the dashboard's own services do. So every client-side "is this
// person signed in?" check on /chat read `user === null` for a vendor who was
// perfectly well signed in, on a cookie the SERVER was already resolving
// correctly (velte-backend's resolveActor). The two halves disagreed, and the
// client half is the one that decides what a buyer sees:
//
//   - `useCredits` fell through to the GUEST branch and showed a vendor their
//     browser's honour-system balance instead of the credits their catalogue
//     earned them — and never offered the wallet, since that needs a vendor.
//   - `searchStream`'s client gate metered them against the 5-credit guest
//     allowance, so a vendor holding 200 credits was refused after five
//     searches by a counter in localStorage.
//   - `ChatHeader` and the notifications page read the same empty store.
//
// One silent fetch fixes all of them, because they all read one store.
//
// `getMeSilent`, never `getMe`: api-client treats a 401 as a session needing
// recovery and force-redirects to /auth/login, which for the signed-out buyers
// who are most of /chat would be a login wall on a public page. The silent
// variant returns null and leaves the store alone.
//
// Renders nothing, and runs at most once per mount — guarded on the store
// already being empty, so navigating within the chat shell costs no repeat
// request.
export function VendorSessionSync() {
  useEffect(() => {
    if (useUserStore.getState().user) return;
    void usersApi.getMeSilent();
  }, []);

  return null;
}
