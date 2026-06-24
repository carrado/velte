import { jwtVerify } from "jose";

/* Session verification. The upstream backend issues the `auth_token` JWT cookie;
   Velte verifies it locally with JWT_SECRET (same as src/proxy.ts middleware),
   so route guards can authenticate without a round-trip. */

export const AUTH_COOKIE = "auth_token";

export interface Session {
  userId: string;
}

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = payload.userId as string | undefined;
    return userId ? { userId } : null;
  } catch {
    return null;
  }
}
