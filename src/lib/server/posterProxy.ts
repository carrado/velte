import crypto from "crypto";

// Token lifetime — 5 minutes gives users enough time to scroll through the
// feed, while the sec-fetch-dest check blocks new-tab opening at all times.
const TOKEN_TTL_S = 300;

// HMAC-SHA256 produces 32 bytes = 43 base64url chars (no padding).
// The signature is always appended as the last SIG_LEN characters of the
// token so no separator is needed and the token looks like one opaque blob.
const SIG_LEN = 43;

function signingKey(): Buffer {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET is not set");
  if (/^[0-9a-f]{64,}$/i.test(raw.trim())) {
    return Buffer.from(raw.trim(), "hex");
  }
  return Buffer.from(raw, "utf8");
}

function b64u(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64uDecode(s: string): Buffer {
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function hmac(payload: Buffer): Buffer {
  return crypto.createHmac("sha256", signingKey()).update(payload).digest();
}

function buildToken(imageUrl: string): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_S;
  const payload = Buffer.from(JSON.stringify({ u: imageUrl, e: exp }), "utf8");
  const encodedPayload = b64u(payload);
  const encodedSig = b64u(hmac(payload));
  // Concatenate directly — no separator character
  return encodedPayload + encodedSig;
}

/** Returns the internal fetch path the browser should use. No query params. */
export function posterProxyUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  return `/api/hub/e/${buildToken(imageUrl)}`;
}

export interface VerifiedToken {
  url: string;
}

/**
 * Verify a path-segment token (no separator — last SIG_LEN chars are the sig).
 * Throws on any failure so the caller can safely return 403.
 */
export function verifyPosterToken(raw: string): VerifiedToken {
  if (raw.length <= SIG_LEN) throw new Error("Token too short");

  const encodedPayload = raw.slice(0, raw.length - SIG_LEN);
  const encodedSig = raw.slice(raw.length - SIG_LEN);

  const payload = b64uDecode(encodedPayload);
  const expected = hmac(payload);
  const actual = b64uDecode(encodedSig);

  if (
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(actual, expected)
  ) {
    throw new Error("Invalid signature");
  }

  let parsed: { u?: string; e?: number };
  try {
    parsed = JSON.parse(payload.toString("utf8"));
  } catch {
    throw new Error("Malformed payload");
  }

  if (!parsed.u || typeof parsed.u !== "string") {
    throw new Error("Missing url");
  }
  if (
    typeof parsed.e !== "number" ||
    Math.floor(Date.now() / 1000) > parsed.e
  ) {
    throw new Error("Token expired");
  }

  // Allowlist: only proxy Cloudinary-hosted assets
  try {
    const { hostname } = new URL(parsed.u);
    if (
      !hostname.endsWith(".cloudinary.com") &&
      hostname !== "cloudinary.com"
    ) {
      throw new Error("Untrusted origin");
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Untrusted origin") throw err;
    throw new Error("Invalid url");
  }

  return { url: parsed.u };
}
