import { jwtVerify } from "jose";

/* Buyer-side counterpart to session.ts. Deliberately a SEPARATE cookie
   (buyer_auth_token, not auth_token) and a separate verify function — a
   buyer and vendor session need to coexist in the same browser without one
   overwriting the other, and the backend's buyer JWT carries a `buyerId` +
   `type: "buyer"` claim, not `userId` (see velte-backend's
   buyerAuth.controller.js). Same JWT_SECRET as the vendor session — the
   backend signs both with it. */

export const BUYER_AUTH_COOKIE = "buyer_auth_token";

export interface BuyerSession {
  buyerId: string;
}

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function verifyBuyerSession(
  token: string,
): Promise<BuyerSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "buyer") return null;
    const buyerId = payload.buyerId as string | undefined;
    return buyerId ? { buyerId } : null;
  } catch {
    return null;
  }
}
