/* Lightweight buyer-facing API client — deliberately SEPARATE from
   api-client.ts's `api`, not a wrapper around it. That client's global 401
   handler clears the vendor session (useUserStore) and force-redirects to
   /auth/login — firing it for a buyer's 401 would be wrong on both counts:
   it would wipe a vendor session that might legitimately be active
   alongside a buyer one in the same browser (buyer_auth_token is a
   separate cookie specifically so the two can coexist), and there's no
   buyer login page to send them to anyway — a buyer isn't an account, just
   a one-time phone verification (see Buyer.model.js's own comment). This
   client just throws ApiError and leaves handling entirely to the caller —
   in practice that just means re-showing the phone/OTP capture inline.

   Not buyer-only in practice since 2026-09-27: a VENDOR proving an
   alternate number for a Buyer Request ("use your signup number, or
   another") goes through the same /api/buyer-auth OTP endpoints, and those
   routes now accept either session. The same two properties are exactly why
   that is safe here — it never clears the vendor session and never
   redirects — so this client keeps being the right one to call for both. */

import { ApiError } from "@/lib/api-client";

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new ApiError(
      0,
      "Couldn't reach the server. Please check your internet connection and try again.",
    );
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }

  if (!res.ok) {
    const fallback =
      res.status >= 500
        ? "We're having trouble reaching the server. Please try again in a moment."
        : "Something went wrong. Please try again.";
    const rawError = (data as { error?: unknown } | null)?.error;
    const message =
      typeof rawError === "string" && rawError.trim() ? rawError : fallback;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const buyerApi = {
  get: <T = unknown>(path: string) => request<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  del: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
};
