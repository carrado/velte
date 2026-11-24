import crypto from "crypto";

// Token lifetime — 1 hour default TTL with automatic renewal on render
const TOKEN_TTL_S = 60 * 60;

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

export interface BuildAssetRefOptions {
  ttlSeconds?: number;
  sessionToken?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

export function generateSessionFingerprint(
  sessionToken?: string | null,
  clientIp?: string | null,
  userAgent?: string | null,
): string {
  const rawKey = encryptionKey();
  const raw = `${sessionToken || ""}|${clientIp || ""}|${(userAgent || "").slice(0, 32)}`;
  return crypto
    .createHmac("sha256", rawKey)
    .update(raw)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Builds an opaque, encrypted media reference for an image URL using AES-256-GCM.
 * Supports Expiry (TTL) and Session Binding.
 */
export function buildAssetRef(
  imageUrl: string,
  options?: BuildAssetRefOptions,
): string {
  if (!imageUrl) return "";
  const key = encryptionKey();
  const iv = crypto
    .createHmac("sha256", key)
    .update(imageUrl)
    .digest()
    .subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ttl = options?.ttlSeconds ?? TOKEN_TTL_S;
  const exp = Math.floor(Date.now() / 1000) + ttl;

  let sessionFingerprint: string | undefined;
  if (options?.sessionToken || options?.clientIp || options?.userAgent) {
    sessionFingerprint = generateSessionFingerprint(
      options.sessionToken,
      options.clientIp,
      options.userAgent,
    );
  }

  const payload: { u: string; e: number; s?: string } = {
    u: imageUrl,
    e: exp,
  };
  if (sessionFingerprint) {
    payload.s = sessionFingerprint;
  }

  const payloadStr = JSON.stringify(payload);
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

export function isTrustedMediaOrigin(hostname: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return (
    h.endsWith(".cloudinary.com") ||
    h === "cloudinary.com" ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "res.cloudinary.com"
  );
}

/**
 * Decrypts and verifies an opaque media reference.
 * Accepts both encrypted tokens and trusted direct media URLs (e.g. Cloudinary assets
 * uploaded by users across the application).
 */
export function verifyAssetRef(
  raw: string,
  requestFingerprint?: string,
): VerifiedAssetRef {
  if (!raw || typeof raw !== "string") {
    throw new Error("Missing token");
  }

  // Strip any API proxy prefixes (supports both /api/media and /api/hub/media / e)
  let clean = raw
    .trim()
    .replace(/^\/api\/(hub\/)?(e|media)(\/|\?ref=|\?url=|\?src=)/, "");

  // If query parameters were attached in the string
  if (clean.includes("?")) {
    const qIndex = clean.indexOf("?");
    const queryPart = clean.substring(qIndex);
    const searchParams = new URLSearchParams(queryPart);
    const extracted =
      searchParams.get("ref") ||
      searchParams.get("url") ||
      searchParams.get("src") ||
      searchParams.get("token");
    if (extracted) {
      clean = extracted;
    } else {
      clean = clean.substring(0, qIndex);
    }
  }

  // Direct URL passed (e.g. user-uploaded Cloudinary image from across the app)
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const { hostname } = new URL(clean);
      if (!isTrustedMediaOrigin(hostname)) {
        throw new Error("Untrusted origin");
      }
      return { url: clean };
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Untrusted origin") throw err;
      throw new Error("Invalid url");
    }
  }

  // Relative path to local assets (e.g. /hub/vendor-hub-store.jpg)
  if (clean.startsWith("/")) {
    return { url: clean };
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

  let parsed: { u?: string; e?: number; s?: string };
  try {
    parsed = JSON.parse(decryptedStr);
  } catch {
    throw new Error("Malformed decrypted payload");
  }

  if (!parsed.u || typeof parsed.u !== "string") {
    throw new Error("Missing url in token");
  }

  // 1. Expiry Check
  if (parsed.e && typeof parsed.e === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (parsed.e < now) {
      throw new Error("Token expired");
    }
  }

  // 2. Session Binding Check
  if (parsed.s && typeof parsed.s === "string" && requestFingerprint) {
    if (parsed.s !== requestFingerprint) {
      throw new Error("Session mismatch");
    }
  }

  // Allowlist: only proxy Cloudinary-hosted or trusted assets
  try {
    const { hostname } = new URL(parsed.u);
    if (!isTrustedMediaOrigin(hostname)) {
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

export function sniffMimeType(bytes: Buffer): string {
  if (bytes.length >= 4) {
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return "image/png";
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46
    ) {
      return "image/webp";
    }
    if (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    ) {
      return "image/gif";
    }
    if (
      (bytes[0] === 0x3c &&
        bytes[1] === 0x73 &&
        bytes[2] === 0x76 &&
        bytes[3] === 0x67) ||
      bytes.subarray(0, 100).toString("utf8").toLowerCase().includes("<svg")
    ) {
      return "image/svg+xml";
    }
  }
  return "image/jpeg";
}

/**
 * Core media streaming proxy handler used by both /api/media (generic) and /api/hub/media.
 * Supports:
 *  - Encrypted tokens and raw Cloudinary user upload URLs.
 *  - Masked byte streams (for ProtectedPosterPreview / canvas).
 *  - Direct image streaming (for standard <img>, Next.js <Image>, or download).
 */
export async function streamMediaResponse(
  req: Request,
  pathRef?: string,
  defaultMask?: boolean,
): Promise<Response> {
  let ref = pathRef || "";
  let rawRequested = false;
  let maskRequested = false;

  const url = new URL(req.url);
  const searchParams = url.searchParams;

  // Extract session fingerprint from the incoming request
  const cookieHeader = req.headers.get("cookie") || "";
  const authCookie =
    cookieHeader.split(";").find((c) => c.trim().startsWith("auth_token=")) ||
    cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("buyer_auth_token="));
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  const userAgent = req.headers.get("user-agent") || "";
  const requestFingerprint = generateSessionFingerprint(
    authCookie,
    clientIp,
    userAgent,
  );

  if (req.method === "POST") {
    try {
      const text = (await req.text()).trim();
      if (text.startsWith("{")) {
        const data = JSON.parse(text);

        // ── 1. Batch Request Handling (Single API call for multiple visible images) ──
        if (data?.refs && Array.isArray(data.refs)) {
          const rawRefs: unknown[] = data.refs;
          const refs: string[] = Array.from<string>(
            new Set(
              rawRefs.filter(
                (r): r is string => typeof r === "string" && r.length > 0,
              ),
            ),
          ).slice(0, 40); // Cap at 40 per batch

          const items: Record<
            string,
            { data: string; mime: string } | { error: string }
          > = {};

          await Promise.all(
            refs.map(async (itemRef) => {
              try {
                const verified = verifyAssetRef(itemRef, requestFingerprint);
                let targetUrl = verified.url;
                if (targetUrl.startsWith("/")) {
                  const origin = url.origin || "http://localhost:4001";
                  targetUrl = `${origin}${targetUrl}`;
                }

                const upstream = await fetch(targetUrl, {
                  headers: { Accept: "image/*,*/*;q=0.8" },
                });

                if (!upstream.ok) {
                  items[itemRef] = {
                    error: `Upstream error ${upstream.status}`,
                  };
                  return;
                }

                const rawBytes = Buffer.from(await upstream.arrayBuffer());
                const maskedBytes = maskMediaBuffer(rawBytes, itemRef);
                const mime = sniffMimeType(rawBytes);

                items[itemRef] = {
                  data: maskedBytes.toString("base64"),
                  mime,
                };
              } catch (err: unknown) {
                const message =
                  err instanceof Error ? err.message : "Invalid ref";
                items[itemRef] = { error: message };
              }
            }),
          );

          return new Response(JSON.stringify({ items }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, private",
            },
          });
        }

        // Single POST request
        ref = (data?.ref ||
          data?.url ||
          data?.src ||
          data?.token ||
          data?.payload ||
          data?.mediaToken ||
          "") as string;
        if (data?.raw === true || data?.raw === "true" || data?.raw === 1) {
          rawRequested = true;
        }
        if (data?.mask === true || data?.mask === "true" || data?.mask === 1) {
          maskRequested = true;
        }
      } else {
        ref = text;
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } else {
    // GET
    if (!ref) {
      ref =
        searchParams.get("ref") ||
        searchParams.get("url") ||
        searchParams.get("src") ||
        searchParams.get("token") ||
        searchParams.get("payload") ||
        "";
    }
    if (
      searchParams.get("raw") === "true" ||
      searchParams.get("raw") === "1" ||
      searchParams.get("direct") === "1" ||
      searchParams.get("direct") === "true"
    ) {
      rawRequested = true;
    }
    if (
      searchParams.get("mask") === "true" ||
      searchParams.get("mask") === "1" ||
      searchParams.get("masked") === "true" ||
      searchParams.get("masked") === "1"
    ) {
      maskRequested = true;
    }
  }

  if (!ref) {
    return new Response(JSON.stringify({ error: "Missing media reference" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Determine whether to mask the header:
  // - If rawRequested is true, NEVER mask.
  // - If maskRequested is true, ALWAYS mask.
  // - If POST (e.g. from ProtectedPosterPreview), default to MASK.
  // - If GET: if defaultMask is true (e.g. legacy /api/hub/media), mask unless rawRequested.
  //   Otherwise (standard /api/media GET), serve as direct image so <img> and Next/Image render smoothly.
  const shouldMask = rawRequested
    ? false
    : maskRequested
      ? true
      : req.method === "POST"
        ? true
        : defaultMask === true;

  let targetUrl: string;
  try {
    const verified = verifyAssetRef(ref, requestFingerprint);
    targetUrl = verified.url;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Invalid media reference";
    return new Response(JSON.stringify({ error: message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If local relative asset (e.g. /hub/vendor-hub-store.jpg)
  if (targetUrl.startsWith("/")) {
    const origin = url.origin || "http://localhost:4001";
    targetUrl = `${origin}${targetUrl}`;
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      headers: { Accept: "image/*,*/*;q=0.8" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to connect to upstream media provider" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({
        error: `Upstream media returned status ${upstream.status}`,
      }),
      {
        status: upstream.status >= 500 ? 502 : upstream.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const rawBytes = Buffer.from(await upstream.arrayBuffer());

  if (shouldMask) {
    const maskedBytes = maskMediaBuffer(rawBytes, ref);
    return new Response(new Uint8Array(maskedBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }

  // Direct clean image streaming
  const upstreamType = upstream.headers.get("content-type");
  const contentType =
    upstreamType && upstreamType.startsWith("image/")
      ? upstreamType
      : sniffMimeType(rawBytes);

  const etag =
    upstream.headers.get("etag") ||
    crypto.createHash("md5").update(rawBytes).digest("hex");

  return new Response(new Uint8Array(rawBytes), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
      ETag: `"${etag}"`,
    },
  });
}
