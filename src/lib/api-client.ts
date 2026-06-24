/* Frontend → Velte API-route client. Sends/receives JSON, includes the session
   cookie, and throws ApiError(status, message) on non-2xx. Routes return plain
   `{ key }` payloads and `{ error }` on failure — no envelope. Pass the full
   path including `/api` (e.g. `api.get("/api/orders")`). */

import { useUserStore } from "@/store/userStore";

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
    if (!isAuthPage) window.location.href = "/auth/login";
  }
}

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
    // fetch() only rejects on a network-level failure (offline/DNS/unreachable).
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
    const message = (data as { error?: string } | null)?.error ?? fallback;
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
