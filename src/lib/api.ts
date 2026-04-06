// lib/api.ts
const API_BASE = "/api"; // Proxy through Next.js

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiOptions extends RequestInit {
  method?: HttpMethod;
  data?: any;
}

export async function apiClient(endpoint: string, options: ApiOptions = {}) {
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
    ) as Error & { status?: number; data?: any };
    err.status = res.status;
    err.data = error;
    throw err;
  }
  return res.json();
}
