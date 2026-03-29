// lib/api.ts
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiOptions extends RequestInit {
  method?: HttpMethod;
  data?: any;
}

export async function apiClient(endpoint: string, options: ApiOptions = {}) {
  const { method = "GET", data, headers, ...rest } = options;

  const url = `${API_BASE}${endpoint}`;
  const fetchOptions: RequestInit = {
    method,
    credentials: "include",
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
