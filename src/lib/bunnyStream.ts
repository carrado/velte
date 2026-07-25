import { Upload } from "tus-js-client";

// Bunny Stream — video upload/playback only. Images stay on Cloudinary (see
// cloudinary.ts); video moved here entirely after Cloudinary's plan-tier
// 100MB file-size ceiling turned out to reject a large share of real iPhone
// footage outright, with no server-side recovery once a file was already too
// big. Bunny has no equivalent hard wall — cost scales with actual
// storage/bandwidth instead (~$5/mo comfortably covers a marketplace at this
// app's current scale; see the vendor wallet-style monetization notes for
// the same "usage-based, not a hard cap" reasoning applied elsewhere).
const TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
// A sanity ceiling, not a technical requirement the way Cloudinary's 100MB
// was — Bunny will happily accept a larger file, this just guards against
// something pathological (a vendor picking the wrong file entirely) rather
// than rejecting real footage. 600MB covers even a 90s 4K60 iPhone clip
// (~450-560MB at default HEVC settings) with real margin.
const MAX_VIDEO_BYTES = 600 * 1024 * 1024; // 600 MB
const MAX_VIDEO_DURATION_S = 90;

export const MAX_VIDEO_MB = MAX_VIDEO_BYTES / (1024 * 1024);
export { MAX_VIDEO_DURATION_S };

// Sync checks only (type/size) — duration needs the browser to actually
// decode metadata, which is async, so it's a separate check below.
export function validateVideoFile(file: File): string | null {
  // file.type falls back to checking the extension — Windows has had no OS-
  // level MIME association for .mov since Apple discontinued QuickTime for
  // Windows in 2016, so Chrome/Edge there commonly reports file.type as an
  // EMPTY STRING for a real, valid .mov file. Rejecting on file.type alone
  // means a Windows vendor can never upload a .mov at all, regardless of
  // whether the file itself is fine — found live.
  const hasAllowedType = ALLOWED_VIDEO_TYPES.includes(file.type);
  const hasAllowedExtension = ALLOWED_VIDEO_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );
  if (!hasAllowedType && !hasAllowedExtension)
    return "Only MP4, WebM, or MOV videos are allowed";
  if (file.size > MAX_VIDEO_BYTES)
    return `Video must be under ${MAX_VIDEO_MB}MB`;
  return null;
}

// A long product "demo" defeats the point (buyers skim, they don't watch a
// pitch) — capped client-side before ever uploading.
//
// This can only ever fail OPEN (resolve null — "no problem found"), never
// block on its own inability to read the file: a desktop browser's <video>
// decode support is a real, common gap unrelated to whether the file itself
// is valid — Chrome/Edge on Windows in particular frequently can't decode a
// .mov at all (QuickTime container + HEVC, iPhone's default recording
// format, has far weaker support outside Safari/macOS) and fires onerror on
// a completely fine file. The timeout covers the same failure mode for the
// case where the browser neither fires onloadedmetadata NOR onerror and
// just hangs — found live, this previously left the upload button stuck
// disabled forever, which reads as a silently broken feature, not a
// rejected file.
const DURATION_CHECK_TIMEOUT_MS = 8000;

export function validateVideoDuration(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const finish = (result: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    const timeoutId = setTimeout(() => {
      console.warn(
        "[bunnyStream] Video metadata read timed out — uploading unverified",
      );
      finish(null);
    }, DURATION_CHECK_TIMEOUT_MS);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      finish(
        video.duration > MAX_VIDEO_DURATION_S
          ? `Video must be ${MAX_VIDEO_DURATION_S} seconds or shorter`
          : null,
      );
    };
    video.onerror = () => {
      console.warn(
        "[bunnyStream] Browser couldn't decode this video for a duration check — uploading unverified",
      );
      finish(null);
    };
    video.src = objectUrl;
  });
}

interface BunnyUploadAuth {
  videoId: string;
  libraryId: string;
  signature: string;
  expire: number;
}

async function getUploadAuth(title: string): Promise<BunnyUploadAuth> {
  const res = await fetch("/api/videos/bunny-upload-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? "Couldn't start the video upload",
    );
  }
  return res.json();
}

// Resumable, direct-to-Bunny upload via the TUS protocol — the API key never
// reaches the browser (see the bunny-upload-auth route's own comment); this
// only ever holds a short-lived, single-video signature. Resolves with the
// video's embed player URL, which is what gets stored as the listing's
// videoUrl (a real, working URL end to end — nothing else in the app needs
// to know it's Bunny-specific to use it).
export function uploadVideoToBunny(
  file: File,
  title: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    getUploadAuth(title)
      .then(({ videoId, libraryId, signature, expire }) => {
        const upload = new Upload(file, {
          endpoint: TUS_ENDPOINT,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire: String(expire),
            VideoId: videoId,
            LibraryId: libraryId,
          },
          metadata: {
            filetype: file.type || "video/mp4",
            title,
          },
          onError: (err) =>
            reject(err instanceof Error ? err : new Error(String(err))),
          onProgress: (bytesSent, bytesTotal) => {
            onProgress?.(bytesTotal > 0 ? bytesSent / bytesTotal : 0);
          },
          onSuccess: () => {
            resolve(
              `https://player.mediadelivery.net/embed/${libraryId}/${videoId}`,
            );
          },
        });
        upload.start();
      })
      .catch(reject);
  });
}

function extractVideoId(url: string): string | null {
  const match = url.match(/player\.mediadelivery\.net\/embed\/[^/]+\/([^/?]+)/);
  return match ? match[1] : null;
}

// Bunny auto-generates a thumbnail for every video, served from the
// library's own CDN pull zone (a different host than the embed player) —
// extracts the videoId back out of the embed URL we generated in
// uploadVideoToBunny above and rebuilds that thumbnail path. Falls back to
// the embed URL itself (won't render as an image, but fails visibly rather
// than silently) if the pull zone isn't configured or the URL isn't one of
// ours — should only happen from a missing env var, not real usage.
export function videoPosterUrl(url: string): string {
  const pullZone = process.env.NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE;
  const videoId = extractVideoId(url);
  if (!pullZone || !videoId) return url;
  return `https://${pullZone}/${videoId}/thumbnail.jpg`;
}

export interface VideoStatus {
  ready: boolean;
  progress: number;
}

// Bunny transcodes asynchronously after the raw TUS upload finishes —
// opening the video (vendor previewing their own fresh upload, or a buyer
// arriving within that window) can otherwise land on Bunny's own embed
// player mid-"not ready" state with no useful feedback. This calls our own
// status route (server-side, holds the real API key) so the caller can show
// real progress instead. Fails open — a network hiccup or malformed URL
// just returns null, letting the caller fall back to showing the player
// immediately rather than getting stuck behind a broken status check.
export async function getVideoStatus(
  videoUrl: string,
): Promise<VideoStatus | null> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return null;
  try {
    const res = await fetch(`/api/videos/${videoId}/status`);
    if (!res.ok) return null;
    return (await res.json()) as VideoStatus;
  } catch {
    return null;
  }
}
