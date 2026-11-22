import crypto from "crypto";

// Token lifetime — 30 days so active campaigns and feed items remain viewable
const TOKEN_TTL_S = 30 * 24 * 60 * 60;

function encryptionKey(): Buffer {
  const raw =
    process.env.JWT_SECRET || "velte-poster-proxy-secret-fallback-key-2026";
  return crypto.createHash("sha256").update(raw.trim()).digest();
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

/**
 * Builds an opaque, encrypted media reference for an image URL using AES-256-GCM.
 * The payload is completely encrypted — no part of the URL (or Cloudinary domain)
 * is readable or exposed in client payloads or network tabs.
 *
 * Uses deterministic IV derived from the URL so identical image URLs across
 * listings, adverts, and gallery arrays yield identical reference strings,
 * allowing UI deduplication (new Set) to work accurately.
 */
export function buildAssetRef(imageUrl: string): string {
  if (!imageUrl) return "";
  const key = encryptionKey();
  const iv = crypto
    .createHmac("sha256", key)
    .update(imageUrl)
    .digest()
    .subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const payloadStr = JSON.stringify({ u: imageUrl });
  const encrypted = Buffer.concat([
    cipher.update(payloadStr, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // 16 bytes

  // Format: [12-byte IV][16-byte AuthTag][Ciphertext]
  return b64u(Buffer.concat([iv, tag, encrypted]));
}

/** Returns the opaque media reference for the asset. */
export function assetRef(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  // If it's already an encrypted ref (doesn't start with http or slash), return as is
  if (
    !imageUrl.startsWith("http://") &&
    !imageUrl.startsWith("https://") &&
    !imageUrl.startsWith("/")
  ) {
    return imageUrl;
  }
  return buildAssetRef(imageUrl);
}

/** @deprecated Use assetRef() instead */
export const posterProxyUrl = assetRef;
/** @deprecated Use buildAssetRef() instead */
export const buildToken = buildAssetRef;

export interface VerifiedAssetRef {
  url: string;
}

/** @deprecated Use VerifiedAssetRef instead */
export type VerifiedToken = VerifiedAssetRef;

/**
 * Decrypts and verifies an opaque media reference.
 * Strictly forbids raw URLs to prevent exposing or bypassing encryption.
 */
export function verifyAssetRef(raw: string): VerifiedAssetRef {
  if (!raw || typeof raw !== "string") {
    throw new Error("Missing token");
  }

  const clean = raw.trim().replace(/^\/api\/hub\/(e|media)\//, "");

  // Strictly reject raw URLs in the token payload
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    throw new Error(
      "Raw URLs are not allowed. A secure media token is required.",
    );
  }

  let buf: Buffer;
  try {
    buf = b64uDecode(clean);
  } catch {
    throw new Error("Invalid token encoding");
  }

  // Minimum length: 12 (IV) + 16 (Tag) + 1 (Ciphertext) = 29
  if (buf.length < 29) {
    throw new Error("Token payload too short");
  }

  const key = encryptionKey();
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);

  let decryptedStr: string;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    decryptedStr = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Token verification or decryption failed");
  }

  let parsed: { u?: string; e?: number };
  try {
    parsed = JSON.parse(decryptedStr);
  } catch {
    throw new Error("Malformed decrypted payload");
  }

  if (!parsed.u || typeof parsed.u !== "string") {
    throw new Error("Missing url in token");
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
    throw new Error("Invalid url in token");
  }

  return { url: parsed.u };
}

/** @deprecated Use verifyAssetRef() instead */
export const verifyPosterToken = verifyAssetRef;

/**
 * Proxy any Cloudinary image URL through the protected media proxy.
 * Pass-through for null / undefined / already-encrypted refs.
 * Use this on every product image, advert image, and gig image field
 * before the value reaches a client payload.
 */
export function proxyImageUrl(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  return assetRef(url);
}

/**
 * Proxy an array of image URLs.
 */
export function proxyImageUrls(urls: (string | null | undefined)[]): string[] {
  return urls.map((u) => proxyImageUrl(u) ?? "").filter(Boolean);
}

/**
 * Masks the header of an image buffer with a deterministic key derived from token.
 * This corrupts magic numbers and prevents DevTools from previewing it or allowing
 * saving/copying elsewhere.
 */
export function maskMediaBuffer(buffer: Buffer, token: string): Buffer {
  const mask = crypto.createHash("sha256").update(token).digest();
  const out = Buffer.from(buffer);
  const headerLen = Math.min(out.length, 64);
  for (let i = 0; i < headerLen; i++) {
    out[i] ^= mask[i % mask.length];
  }
  return out;
}
