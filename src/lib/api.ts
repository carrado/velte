// lib/api.ts
import { useUserStore } from "@/store/userStore";

const API_BASE = "/api"; // Proxy through Next.js

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiOptions extends RequestInit {
  method?: HttpMethod;
  data?: unknown;
}

type ApiClientError = Error & { status?: number; data?: unknown };

function handleUnauthenticated() {
  useUserStore.getState().clearUser();
  if (typeof window !== "undefined") {
    const isAuthPage = window.location.pathname.startsWith("/auth");
    if (!isAuthPage) {
      window.location.href = "/auth/login";
    }
  }
}

export async function apiClient<TResponse = unknown>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<TResponse> {
  const { method = "GET", data, headers, ...rest } = options;

  const url = `${API_BASE}${endpoint}`; // e.g., /api/auth/login
  const fetchOptions: RequestInit = {
    method,
    credentials: "include", // Still needed for cookies on the same domain
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
  };

  if (data && method !== "GET") {
    fetchOptions.body = JSON.stringify(data);
  }

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const err = new Error(
      error.message || `Request failed with status ${res.status}`,
    ) as ApiClientError;
    err.status = res.status;
    err.data = error;

    if (res.status === 401) {
      handleUnauthenticated();
    }

    throw err;
  }
  return (await res.json()) as TResponse;
}
