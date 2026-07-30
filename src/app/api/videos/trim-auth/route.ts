import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/server/guards";

// POST /api/videos/trim-auth   (authenticated — AddProductPage's
// startTrimUpload, right before it starts uploading an over-length
// original). The video-trim VM has no
// session cookie to check, so instead of cookie auth it gets a short-lived,
// single-job JWT signed here with a secret only this app and that VM share
// (TRIM_SERVICE_JWT_SECRET — deliberately NOT the same secret as
// JWT_SECRET/session auth, so a leak on one side doesn't compromise the
// other). The VM verifies this token on /uploads/init and /uploads/complete
// — the actual video bytes never touch it at all, those go straight from
// this browser to R2 against the presigned per-part URLs /uploads/init
// hands back (see videoTrim.ts).
function secret(): Uint8Array {
  const s = process.env.TRIM_SERVICE_JWT_SECRET;
  if (!s) throw new Error("TRIM_SERVICE_JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function POST() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const serviceUrl = process.env.TRIM_SERVICE_URL;
  if (!serviceUrl) {
    return jsonError(
      500,
      "Server-side video trimming is not configured — add TRIM_SERVICE_URL and TRIM_SERVICE_JWT_SECRET to the server .env",
    );
  }

  const jobId = crypto.randomUUID();

  let token: string;
  try {
    token = await new SignJWT({ jobId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(gate.userId)
      .setIssuedAt()
      // 4 hours — this token has to stay valid for the ENTIRE upload (it
      // gates /uploads/complete too, not just /uploads/init), and the size
      // cap is now 2GB (see bunnyStream.ts's MAX_VIDEO_BYTES) specifically
      // so a vendor can record several minutes of 4K60 and trim it down.
      // Even a slow connection uploading that much shouldn't lose a race
      // against this expiring near the finish line — see multipartRouter.js's
      // matching PART_URL_EXPIRY_S.
      .setExpirationTime("4h")
      .sign(secret());
  } catch (err) {
    console.error("[trim-auth] failed to sign token:", err);
    return jsonError(500, "Couldn't start server-side trimming — try again.");
  }

  const base = serviceUrl.replace(/\/$/, "");
  return NextResponse.json({
    jobId,
    token,
    initUrl: `${base}/uploads/init`,
    completeUrl: `${base}/uploads/complete`,
    statusUrl: `${base}/jobs/${jobId}`,
    cancelUrl: `${base}/uploads/cancel`,
  });
}
