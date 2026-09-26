/* Frontend → Velte API-route client. Sends/receives JSON, includes the session
   cookie, and throws ApiError(status, message) on non-2xx. Routes return plain
   `{ key }` payloads and `{ error }` on failure — no envelope. Pass the full
   path including `/api` (e.g. `api.get("/api/orders")`). */

import { useUserStore } from "@/store/userStore";
import { useBlockedStore } from "@/store/blockedStore";

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

function handleUnauthenticated() {
  useUserStore.getState().clearUser();
  if (typeof window !== "undefined") {
    const isAuthPage = window.location.pathname.startsWith("/auth");
    // .replace(), not .href= — a plain assignment pushes a new history
    // entry on top of whatever the user was doing when their session
    // turned out to be stale (e.g. a transient 401 right after returning
    // from an external redirect like Paystack's checkout). With .href=,
    // that leaves the pre-401 page one back-press away, and pressing back
    // from THIS forced login screen would just re-trigger the same 401 and
    // bounce right back here — .replace() drops that entry entirely so
    // back-navigation from the app behaves sanely afterward.
    if (!isAuthPage) window.location.replace("/auth/login");
  }
}

// A deadline on every request made through this client (2026-09-26).
//
// fetch() has no timeout of its own, so a request that hung — half-open
// connection, mobile network that dropped without a FIN — never resolved AND
// never rejected. Nothing in this file turns that into an ApiError, and the
// dashboard's init gate (src/app/[id]/layout.tsx) waits on exactly this call:
// meStatus stayed "loading", which is a full-screen `inset-0 z-[9999]`
// overlay, and the only escape was a manual refresh. The ceiling turns a hang
// into ApiError(0) — the transport-failure code callers already branch on —
// so the app falls through to its own retry path.
//
// NOT applied to the search stream, and deliberately not special-cased here
// either: src/lib/searchStream.ts issues its own raw fetch() with its own
// AbortSignal (the guest network gate) and never comes through this client,
// so a turn that streams for a minute is untouched by construction.
//
// The escape hatch for anything else long-lived is the rule in request() — a
// caller that passes its own `signal` owns its own cancellation and gets no
// deadline imposed on it, so an aborting/streaming call opts out by
// construction rather than by being name-matched here. Note it is NOT
// reachable from the `api` object below: those wrappers take (path, body) and
// never forward a signal, so widening this to a genuinely long-lived call means
// adding an options parameter there first, not just passing one here.
const REQUEST_TIMEOUT_MS = 15_000;

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    const { signal, ...rest } = options;
    res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...options.headers },
      ...rest,
      // Set last, and either/or — never both, so a caller's signal can't be
      // silently overridden and ours can't be silently dropped.
      signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // fetch() rejects on a network-level failure (offline/DNS/unreachable) or
    // on an abort — which now includes our own timeout above. Both are the
    // same class of failure to every caller: the request never completed.
    throw new ApiError(
      0,
      "Couldn't reach the server. Please check your internet connection and try again.",
    );
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* no body (e.g. an unhandled 500 returning HTML) */
  }

  if (!res.ok) {
    if (res.status === 401) handleUnauthenticated();
    const fallback =
      res.status >= 500
        ? "We're having trouble reaching the server. Please try again in a moment."
        : "Something went wrong. Please try again.";
    // `error` is typed as string for convenience, but that's just a cast —
    // an unexpected non-string value here would otherwise get silently
    // stringified into the literal text "[object Object]" by Error's own
    // constructor (found live via a similar bug in lib/server/backend.ts's
    // messageFrom). Guard the same way rather than trusting the cast.
    const rawError = (data as { error?: unknown } | null)?.error;
    const message =
      typeof rawError === "string" && rawError.trim() ? rawError : fallback;
    // 423 Locked = blocked account (super admin panel) — distinct from 401
    // (no/expired session) and the unverified-email 403. Fires for BOTH a
    // rejected login attempt and an already-logged-in vendor blocked
    // mid-session, since every authenticated call funnels through here.
    if (res.status === 423) useBlockedStore.getState().setBlocked(message);
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  del: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
};
