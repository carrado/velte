import { Upload } from "tus-js-client";
import { parseMp4Duration } from "./mp4Duration";

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
// A sanity ceiling, not a technical requirement — Bunny will happily accept
// a larger file. There's no more "record extra, trim it down" flow (see
// checkVideoDuration below — over the cap is now a hard rejection, not an
// in-app trim), so this only ever needs to cover a genuine, real recording
// AT the length cap, not a longer original a vendor intended to cut down.
// Sized off real numbers, not the old ~450-560MB/90s estimate: Apple's own
// published figure for standard 4K60 HEVC is ~400MB/min (~1.2GB for a full
// MAX_VIDEO_DURATION_S), but newer Pro models (iPhone 15 Pro+) default to a
// noticeably higher bitrate (~100Mbps, ~750MB/min) — ~2.25GB for a full 3
// minutes. A 1.5GB cap would already hard-reject a genuine, ordinary
// recording from those phones; 2.5GB leaves real margin above that instead.
const MAX_VIDEO_BYTES = 2.5 * 1024 * 1024 * 1024; // 2.5 GB
const MAX_VIDEO_DURATION_S = 180;

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
// Base timeout for a small file — scaled up for larger ones below. A
// desktop browser's <video> decode support is a real, common gap unrelated
// to whether the file itself is valid — Chrome/Edge on Windows in
// particular frequently can't decode a .mov at all (QuickTime container +
// HEVC, iPhone's default recording format, has far weaker support outside
// Safari/macOS) and fires onerror on a completely fine file. The timeout
// covers the same failure mode for the case where the browser neither fires
// onloadedmetadata NOR onerror and just hangs — found live, this previously
// left the upload button stuck disabled forever, which reads as a silently
// broken feature, not a rejected file.
const DURATION_CHECK_BASE_TIMEOUT_MS = 8000;
const DURATION_CHECK_MAX_TIMEOUT_MS = 30_000;
// Roughly 1s of extra headroom per 10MB — a large file (found live: a
// 381MB/2m41s clip picked from an Android PWA) can genuinely take longer
// than a small one to have its metadata read, especially on a lower-end
// device, and that shouldn't get less time just because it's the case this
// matters most for.
const DURATION_CHECK_MS_PER_BYTE = 1000 / (10 * 1024 * 1024);

function videoMetadataTimeoutMs(fileSizeBytes: number): number {
  return Math.min(
    DURATION_CHECK_MAX_TIMEOUT_MS,
    Math.max(
      DURATION_CHECK_BASE_TIMEOUT_MS,
      fileSizeBytes * DURATION_CHECK_MS_PER_BYTE,
    ),
  );
}

// Resolves the browser's own <video> element duration, or null if it can't
// read it within the (size-scaled) timeout, or fires onerror trying. This is
// the FALLBACK path — see checkVideoDuration below, which tries the
// container-level parser (ground truth) first and only reaches this for
// files that parser can't resolve.
function readVideoElementDurationS(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const finish = (result: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    const timeoutId = setTimeout(
      () => finish(null),
      videoMetadataTimeoutMs(file.size),
    );

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      // Some phone/app-forwarded MP4s (WhatsApp re-mux, certain camera apps)
      // leave the moov/mvhd duration unresolved — Chrome then reports
      // `Infinity` (or occasionally `NaN`) here rather than throwing, which
      // is > MAX_VIDEO_DURATION_S and wrongly rejects a genuinely short,
      // valid video — found live: a real 131s/331MB clip flagged as over
      // 180s. Treat a non-finite/zero reading as "couldn't determine" so
      // the caller falls back to the container-level parser instead of
      // trusting the browser's bogus number.
      const d = video.duration;
      finish(Number.isFinite(d) && d > 0 ? d : null);
    };
    video.onerror = () => finish(null);
    video.src = objectUrl;
  });
}

export type VideoDurationCheck =
  /** Under the cap — upload as-is. */
  | { kind: "ok" }
  /** Over the cap — rejected outright, no in-app trim. Auto-trimming used to
   * happen server-side (a separate ffmpeg VM + Cloudflare R2 detour — see
   * git history), but that whole pipeline was the source of every upload
   * reliability issue found live on real vendor phones (weak/mobile
   * connections failing the custom multipart upload it depended on). Since
   * the outcome was always "keep the first N seconds" anyway, dropping the
   * auto-trim entirely and just asking the vendor to trim it themselves
   * (their phone's gallery app, or wherever they got the clip) removes that
   * whole failure-prone pipeline rather than continuing to harden it.
   * `durationS` is null when even the <video>-element fallback below
   * couldn't read it — still rejected, the caller just can't show the
   * vendor an exact "this video is X long" figure in the error. */
  | { kind: "over-limit"; durationS: number | null };

// Classifies a picked video for AddProductPage's handleVideoUpload. Tries
// parseMp4Duration FIRST — it reads the real duration straight out of the
// file's own moov/mvhd box, so it's ground truth rather than a heuristic,
// and (per its own comments) cheap regardless of file size. The <video>
// element is decode-based instead: it has to get the browser's actual
// codec pipeline far enough to report metadata, which is exactly what goes
// wrong on real vendor phones — HEVC decode gaps on Android Chrome/WebView,
// or (found live) an unresolved/placeholder mvhd duration that some phone
// camera apps and WhatsApp's re-mux leave behind, which Chrome then surfaces
// as `Infinity` and wrongly flags a genuinely short video as over the cap.
// So the <video> element is only the FALLBACK now, for files
// parseMp4Duration can't resolve at all — non-ISO-BMFF containers (WebM) or
// a truly fragmented/streamed MP4 with no single mvhd duration.
export async function checkVideoDuration(
  file: File,
): Promise<VideoDurationCheck> {
  const parsedDurationS = await parseMp4Duration(file);
  if (parsedDurationS != null) {
    return parsedDurationS > MAX_VIDEO_DURATION_S
      ? { kind: "over-limit", durationS: parsedDurationS }
      : { kind: "ok" };
  }

  console.warn(
    "[bunnyStream] Container-level duration parsing came up empty — falling back to the browser's <video> element",
  );
  const previewDurationS = await readVideoElementDurationS(file);
  if (previewDurationS != null) {
    return previewDurationS > MAX_VIDEO_DURATION_S
      ? { kind: "over-limit", durationS: previewDurationS }
      : { kind: "ok" };
  }
  return { kind: "over-limit", durationS: null };
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
//
// `signal` lets a caller cancel an in-flight upload (AddProductPage's
// floating progress bar) — this doesn't just stop the TUS transfer
// client-side, it also deletes the video container Bunny already created
// at auth time (see deleteBunnyVideo), so a cancelled upload doesn't leave
// an orphaned, partially-uploaded video sitting in the library forever.
export function uploadVideoToBunny(
  file: File,
  title: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    getUploadAuth(title)
      .then(({ videoId, libraryId, signature, expire }) => {
        if (signal?.aborted) {
          fetch(`/api/videos/${videoId}`, { method: "DELETE" }).catch(() => {});
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
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
          onError: (err) => {
            signal?.removeEventListener("abort", onAbort);
            reject(err instanceof Error ? err : new Error(String(err)));
          },
          onProgress: (bytesSent, bytesTotal) => {
            onProgress?.(bytesTotal > 0 ? bytesSent / bytesTotal : 0);
          },
          onSuccess: () => {
            signal?.removeEventListener("abort", onAbort);
            resolve(
              `https://player.mediadelivery.net/embed/${libraryId}/${videoId}`,
            );
          },
        });
        const onAbort = () => {
          upload.abort();
          fetch(`/api/videos/${videoId}`, { method: "DELETE" }).catch(() => {});
          reject(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort);
        upload.start();
      })
      .catch(reject);
  });
}

function extractVideoId(url: string): string | null {
  const match = url.match(/player\.mediadelivery\.net\/embed\/[^/]+\/([^/?]+)/);
  return match ? match[1] : null;
}

// A listing's videoUrl is one of two shapes depending on how it got here:
// Bunny's embed-player URL (short clips uploaded directly, still via
// uploadVideoToBunny above) or a plain R2 file URL (anything that went
// through the trim flow — see velte-video-trim-service's processJob.js,
// which no longer talks to Bunny at all). Callers that render playback
// (FullscreenVideoModal) need to know which one they've got: an iframe
// pointed at Bunny's embed player vs. a native <video> tag for a raw file.
export function isBunnyEmbedUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

// Bunny auto-generates a thumbnail for every video, served from the
// library's own CDN pull zone (a different host than the embed player) —
// extracts the videoId back out of the embed URL we generated in
// uploadVideoToBunny above and rebuilds that thumbnail path. Falls back to
// the embed URL itself (won't render as an image, but fails visibly rather
// than silently) if the pull zone isn't configured — should only happen
// from a missing env var, not real usage.
//
// A non-Bunny videoUrl is a plain R2 file URL from the trim flow instead
// (see uploadVideoToBunny's comment above) — R2 has no auto-thumbnail
// equivalent, so the trim-service's processJob.js mints one itself and
// writes it under the SAME key as the trimmed clip with a .jpg extension
// (videos/<jobId>.mp4 -> videos/<jobId>.jpg). Swapping the extension here
// is all that's needed to find it; nothing else has to carry a separate
// posterUrl field around. If that poster failed to generate (best-effort on
// the trim-service side), this just 404s and VideoPosterImage's onError
// falls back to a placeholder, same as a Bunny thumbnail not being ready yet.
export function videoPosterUrl(url: string): string {
  const videoId = extractVideoId(url);
  if (videoId) {
    const pullZone = process.env.NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE;
    return pullZone ? `https://${pullZone}/${videoId}/thumbnail.jpg` : url;
  }
  return url.replace(/\.(mp4|webm)$/, ".jpg");
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
