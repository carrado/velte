import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE, verifySession } from "./session";
import { BackendError } from "./backend";

/* Request guards, ocare-phinas style: read the session cookie, verify it, and
   return either the authenticated context or a ready-to-return error response.
 *
 *   const gate = await requireAuth();
 *   if ("response" in gate) return gate.response;
 *   const { userId, cookie } = gate;   // cookie → forward to backendFetch
 */

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export const unauthorized = () => jsonError(401, "Not authenticated.");

/** Map a thrown error to a JSON error response — preserves the upstream status. */
export function fail(err: unknown, fallback: string) {
  if (err instanceof BackendError) return jsonError(err.status, err.message);
  return jsonError(500, fallback);
}

/** Relay upstream Set-Cookie headers (e.g. the session cookie from login). */
export function applySetCookies(res: NextResponse, setCookie: string[]) {
  for (const c of setCookie) res.headers.append("set-cookie", c);
  return res;
}

export async function requireAuth(): Promise<
  { userId: string; cookie: string } | { response: NextResponse }
> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return { response: unauthorized() };

  const session = await verifySession(token);
  if (!session) return { response: unauthorized() };

  return { userId: session.userId, cookie: `${AUTH_COOKIE}=${token}` };
}
