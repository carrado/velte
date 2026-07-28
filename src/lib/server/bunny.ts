import { createHash } from "crypto";

// Shared by both bunny-upload-auth (user session, browser-initiated upload)
// and bunny-upload-auth-internal (shared-secret, called by the video-trim
// service after it's cut a clip server-side) — same Bunny "create video +
// sign the TUS upload" step either way, just two different callers with
// different auth models.
const BUNNY_API_BASE = "https://video.bunnycdn.com";

export interface SignedBunnyUpload {
  videoId: string;
  libraryId: string;
  signature: string;
  expire: number;
}

export async function createSignedBunnyUpload(
  title: string,
): Promise<SignedBunnyUpload> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) {
    throw new Error(
      "Video upload is not configured — add BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY to the server .env",
    );
  }

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
  const videoId = data.guid;

  // 1 hour — generous headroom for a large upload on a slow mobile
  // connection (or a slow VM-to-Bunny push) to finish before the
  // signature expires (Bunny's own docs recommend at least this long).
  const expire = Math.floor(Date.now() / 1000) + 3600;
  const signature = createHash("sha256")
    .update(`${libraryId}${apiKey}${expire}${videoId}`)
    .digest("hex");

  return { videoId, libraryId, signature, expire };
}
