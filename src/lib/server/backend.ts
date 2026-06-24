/* The BFF data layer. Velte's API routes are the backend-for-frontend: they own
   auth, validation and response shape, and get their data from the upstream
   velte/staffly backend through these helpers, forwarding the caller's session
   cookie. Throws BackendError(status, message) on a non-2xx upstream response. */

const API_BASE = process.env.BACKEND_API_URL || "http://localhost:5000/api";

export class BackendError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "BackendError";
  }
}

interface BackendOptions {
  method?: string;
  body?: unknown;
  /** Raw `Cookie` header value to forward (carries the session). */
  cookie?: string;
}

function messageFrom(data: unknown, status: number): string {
  return (
    (data as { message?: string; error?: string } | null)?.message ??
    (data as { error?: string } | null)?.error ??
    `Upstream request failed (${status}).`
  );
}

async function doFetch(
  path: string,
  { method = "GET", body, cookie }: BackendOptions,
): Promise<{ res: Response; data: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* upstream returned no/invalid JSON */
  }
  return { res, data };
}

/** Call the backend, returning the parsed body. Throws on non-2xx. */
export async function backendFetch<T = unknown>(
  path: string,
  opts: BackendOptions = {},
): Promise<T> {
  const { res, data } = await doFetch(path, opts);
  if (!res.ok)
    throw new BackendError(res.status, messageFrom(data, res.status));
  return data as T;
}

/** backendFetch + unwrap the `{ data }` envelope the backend uses for most GETs. */
export async function backendData<T = unknown>(
  path: string,
  opts: BackendOptions = {},
): Promise<T> {
  const body = await backendFetch<{ data: T }>(path, opts);
  return body.data;
}

/** Like backendFetch but also returns upstream Set-Cookie headers (auth flows). */
export async function backendFetchWithCookies<T = unknown>(
  path: string,
  opts: BackendOptions = {},
): Promise<{ data: T; setCookie: string[] }> {
  const { res, data } = await doFetch(path, opts);
  if (!res.ok)
    throw new BackendError(res.status, messageFrom(data, res.status));
  const setCookie =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  return { data: data as T, setCookie };
}
