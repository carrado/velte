import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/server/guards";

// POST /api/videos/trim-auth   (authenticated — VideoTrimModal, right before
// it starts uploading an over-length original to the video-trim service).
// That service runs on a separate VM and has no session cookie to check, so
// instead of cookie auth it gets a short-lived, single-job JWT signed here
// with a secret only this app and that VM share (TRIM_SERVICE_JWT_SECRET —
// deliberately NOT the same secret as JWT_SECRET/session auth, so a leak on
// one side doesn't compromise the other). The VM verifies this token on
// every request under its /uploads endpoint before accepting any bytes.
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
      // 1 hour — same generous headroom as the Bunny upload signature, for
      // a large original finishing a slow mobile upload.
      .setExpirationTime("1h")
      .sign(secret());
  } catch (err) {
    console.error("[trim-auth] failed to sign token:", err);
    return jsonError(500, "Couldn't start server-side trimming — try again.");
  }

  return NextResponse.json({
    jobId,
    token,
    uploadUrl: `${serviceUrl.replace(/\/$/, "")}/uploads`,
    statusUrl: `${serviceUrl.replace(/\/$/, "")}/jobs/${jobId}`,
  });
}
