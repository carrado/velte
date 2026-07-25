import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/guards";

// GET /api/videos/:videoId/status — public, read-only, no auth gate. A
// video's transcode status isn't sensitive (the video itself is already
// publicly embeddable once ready, and videoId is an opaque Bunny GUID) —
// this just lets FullscreenVideoModal show real transcode progress instead
// of guessing, for buyers and vendors alike. Same server-side-only API key
// pattern as bunny-upload-auth: the key never reaches the browser.
const BUNNY_API_BASE = "https://video.bunnycdn.com";

interface BunnyVideoResponse {
  status: number;
  encodeProgress?: number;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!/^[a-f0-9-]{20,}$/i.test(videoId)) {
    return jsonError(400, "Invalid video id");
  }

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) {
    return jsonError(500, "Video status is not configured");
  }

  try {
    const res = await fetch(
      `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`,
      { headers: { AccessKey: apiKey, Accept: "application/json" } },
    );
    if (!res.ok) return jsonError(404, "Video not found");

    const data = (await res.json()) as BunnyVideoResponse;
    // Bunny status codes: 0 Created, 1 Uploaded, 2 Processing, 3
    // Transcoding, 4 Finished, 5 Error, 6 UploadFailed — only 4 actually
    // means playable; anything else (including error states) just keeps
    // the caller's "not ready yet" UI showing rather than claiming success.
    const ready = data.status === 4;
    return NextResponse.json({
      ready,
      progress: ready
        ? 100
        : Math.max(0, Math.min(100, data.encodeProgress ?? 0)),
    });
  } catch (err) {
    console.error("[videos/status] Bunny lookup failed:", err);
    return jsonError(502, "Couldn't check video status");
  }
}
