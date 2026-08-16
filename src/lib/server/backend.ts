/* The BFF data layer. Velte's API routes are the backend-for-frontend: they own
   auth, validation and response shape, and get their data from the upstream
   velte/staffly backend through these helpers, forwarding the caller's session
   cookie. Throws BackendError(status, message, fields) on a non-2xx upstream
   response — `fields` carries the backend's per-field validation reasons
   (errRes's `{ error: { code, message, fields } }`) through to the route
   handler so it isn't lost before reaching the vendor. */

const API_BASE = process.env.BACKEND_API_URL || "http://localhost:5000/api";

export class BackendError extends Error {
  status: number;
  fields?: Record<string, string>;
  /** The raw parsed upstream error body — most routes only need
   *  message/fields (already unwrapped above), but a few carry extra
   *  ad-hoc data on specific status codes (e.g. login's 403 including the
   *  vendor's real email for the verify redirect) that isn't worth adding
   *  a dedicated field for here. */
  data?: unknown;
  constructor(
    status: number,
    message: string,
    fields?: Record<string, string>,
    data?: unknown,
  ) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.data = data;
    this.name = "BackendError";
  }
}

interface BackendOptions {
  method?: string;
  body?: unknown;
  /** Raw `Cookie` header value to forward (carries the session). */
  cookie?: string;
}

// Pulls a human-readable string out of an upstream error field — the field
// is typed as `string` above for convenience, but that's just a cast, not a
// runtime guarantee. Some upstream error shapes (e.g. a raw Mongoose
// ValidationError, or an { error: { message, code } } envelope) put an
// OBJECT there instead — found live via the price-change endpoint, where
// that object was passed straight into `new BackendError(status, obj)`,
// and Error's constructor silently stringifies a non-string argument via
// `String(obj)`, which for a plain object is literally the string
// "[object Object]". That then flows untouched through fail()/jsonError()
// all the way to the vendor's toast. This unwraps one level of nesting
// (`{ error: { message: "..." } }`) before giving up, so a real backend
// message still surfaces when available, and only falls back to the
// generic upstream-failed text when it genuinely can't find a string.
function extractMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const nested = (value as { message?: unknown }).message;
    if (typeof nested === "string" && nested.trim()) return nested;
  }
  return null;
}

function messageFrom(data: unknown, status: number): string {
  const body = data as { message?: unknown; error?: unknown } | null;
  return (
    extractMessage(body?.message) ??
    extractMessage(body?.error) ??
    `Upstream request failed (${status}).`
  );
}

// Pulls the per-field validation reasons out of errRes's `{ error: { fields } }`
// shape, when present — same defensive stance as extractMessage above, since
// this is trusting an upstream shape rather than a runtime guarantee.
function fieldsFrom(data: unknown): Record<string, string> | undefined {
  const body = data as { error?: { fields?: unknown } } | null;
  const fields = body?.error?.fields;
  return fields && typeof fields === "object"
    ? (fields as Record<string, string>)
    : undefined;
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
    throw new BackendError(
      res.status,
      messageFrom(data, res.status),
      fieldsFrom(data),
      data,
    );
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
    throw new BackendError(
      res.status,
      messageFrom(data, res.status),
      fieldsFrom(data),
      data,
    );
  const setCookie =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  return { data: data as T, setCookie };
}
