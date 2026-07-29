import { createHash } from "crypto";

// Shared server-side Bunny Stream helpers — the API key never reaches the
// browser, every call here happens from a Next.js route handler.
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

// Called when a vendor cancels a still-in-flight direct upload (see
// bunnyStream.ts's uploadVideoToBunny) — the video "container" createSigned
// BunnyUpload above already created on Bunny needs deleting too, not just
// abandoning client-side, or it lingers in the library forever with
// whatever partial bytes it got. A 404 (already gone, e.g. a double-cancel)
// isn't a real failure here.
export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) {
    throw new Error(
      "Video upload is not configured — add BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY to the server .env",
    );
  }

  const res = await fetch(
    `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`,
    {
      method: "DELETE",
      headers: { AccessKey: apiKey, Accept: "application/json" },
    },
  );
  if (!res.ok && res.status !== 404) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Bunny delete-video failed (${res.status}): ${errBody}`);
  }
}
