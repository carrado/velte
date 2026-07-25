import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/server/guards";

// POST /api/videos/bunny-upload-auth   (authenticated — Add-Offering wizard's
// video tab). Bunny Stream has no unsigned-upload-preset equivalent to
// Cloudinary's — every upload needs a per-video signature computed from the
// account's secret API key, which can only ever happen server-side. This
// route is that one server-side step: create the video "container" on Bunny
// (their Create Video API), compute the signature their TUS endpoint expects,
// and hand the vendor's browser just enough to perform the actual upload
// directly against Bunny (never through this server) via tus-js-client. The
// signature is scoped to this one videoId and expires in an hour — nothing
// returned here is the real secret.
const BUNNY_API_BASE = "https://video.bunnycdn.com";

export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) {
    return jsonError(
      500,
      "Video upload is not configured — add BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY to the server .env",
    );
  }

  const body = (await req.json().catch(() => null)) as {
    title?: string;
  } | null;
  const title = body?.title?.trim() || "Product video";

  let videoId: string;
  try {
    const res = await fetch(`${BUNNY_API_BASE}/library/${libraryId}/videos`, {
      method: "POST",
      headers: {
        AccessKey: apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Bunny create-video failed (${res.status}): ${errBody}`);
    }
    const data = (await res.json()) as { guid: string };
    videoId = data.guid;
  } catch (err) {
    console.error("[bunny-upload-auth] create video failed:", err);
    return jsonError(502, "Couldn't start the video upload — try again.");
  }

  // 1 hour — generous headroom for a large upload on a slow mobile
  // connection to finish before the signature expires (Bunny's own docs
  // recommend at least this long).
  const expire = Math.floor(Date.now() / 1000) + 3600;
  const signature = createHash("sha256")
    .update(`${libraryId}${apiKey}${expire}${videoId}`)
    .digest("hex");

  return NextResponse.json({
    videoId,
    libraryId,
    signature,
    expire,
  });
}
