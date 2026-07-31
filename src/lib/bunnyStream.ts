import { Upload, type HttpRequest, type HttpResponse } from "tus-js-client";
import { parseMp4Duration } from "./mp4Duration";

// navigator.connection (Network Information API) is Chrome/Android-only and
// not yet in lib.dom.d.ts, but that's exactly the platform this matters for
// — declared by hand rather than pulling in a types package for 3 fields.
interface NetworkInformationLike {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
}

function getConnectionInfo(): NetworkInformationLike | null {
  if (typeof navigator === "undefined") return null;
  const conn = (
    navigator as Navigator & { connection?: NetworkInformationLike }
  ).connection;
  if (!conn) return null;
  // NetworkInformation exposes its fields via prototype getters, not own
  // enumerable properties — JSON.stringify silently serializes the live
  // object as `{}` if it's passed through directly. Read the fields out
  // explicitly instead.
  return {
    effectiveType: conn.effectiveType,
    downlink: conn.downlink,
    saveData: conn.saveData,
  };
}

const MIN_CHUNK_BYTES = 512 * 1024; // 512KB — small enough to survive a genuinely poor link
const MAX_CHUNK_BYTES = 6 * 1024 * 1024; // 6MB — the old flat default, used as the ceiling
const TARGET_CHUNK_UPLOAD_SECONDS = 6;

// `downlink` (Mbit/s) is a DOWNLOAD estimate — real upload speed on an
// asymmetric mobile link is often meaningfully worse, so this treats it as
// only half-reliable for sizing an UPLOAD chunk. Aims each chunk at ~6
// seconds of transfer time at that estimated speed: long enough to not
// spam tiny requests on a decent connection, short enough that a weak link
// (found live: downlink≈1.55Mbps still failing on a flat 6MB chunk) gets a
// real chance to complete one before the connection drops. No
// navigator.connection support (desktop, iOS Safari) or no reading yet
// falls back to the old flat 6MB — this can only make the chunk smaller
// than that known-working default, never larger.
function chunkSizeForConnection(): number {
  const downlinkMbps = getConnectionInfo()?.downlink;
  if (!downlinkMbps || downlinkMbps <= 0) return MAX_CHUNK_BYTES;
  const estimatedUploadBytesPerSecond = ((downlinkMbps * 1_000_000) / 8) * 0.5;
  const target = estimatedUploadBytesPerSecond * TARGET_CHUNK_UPLOAD_SECONDS;
  return Math.round(
    Math.min(MAX_CHUNK_BYTES, Math.max(MIN_CHUNK_BYTES, target)),
  );
}

interface RequestLogEntry {
  method: string;
  url: string;
  status?: number;
}

const REQUEST_LOG_LIMIT = 8;

// tus-js-client's onBeforeRequest/onAfterResponse hooks fire for every
// individual HTTP request the upload makes (the initial POST that creates
// the upload, then one PATCH per chunk) — without this there's no way to
// tell, for a failure reported from a vendor's phone we can't get DevTools
// access to, whether the POST ever succeeded at all (Bunny accepted the
// upload) or it died on some later PATCH, and at what HTTP status. Capped
// at REQUEST_LOG_LIMIT entries — a slow-link upload with a small adaptive
// chunk size can rack up hundreds of PATCH requests, and only the shape of
// the failure (did it ever get past the first chunk? did status change
// partway through?) matters, not the full history. The very first entry
// (the POST) is always kept since that's what answers "did creation
// succeed" — only PATCH entries roll off.
function createRequestLogger() {
  const log: RequestLogEntry[] = [];
  return {
    onBeforeRequest: (req: HttpRequest) => {
      log.push({ method: req.getMethod(), url: req.getURL() });
      if (log.length > REQUEST_LOG_LIMIT) {
        log.splice(1, 1);
      }
    },
    onAfterResponse: (_req: HttpRequest, res: HttpResponse) => {
      const entry = log[log.length - 1];
      if (entry) entry.status = res.getStatus();
    },
    get entries() {
      return log;
    },
  };
}

// Fire-and-forget — this is diagnostic logging riding along on top of a
// failure that's already being surfaced to the vendor via the normal error
// toast; it should never itself throw, block, or change what the caller
// sees. See /api/videos/log-error's own comment for why this exists at all
// (a browser can't write to Vercel's server logs directly, and a
// mobile-only upload failure is otherwise invisible without physical
// device access to that one vendor's phone).
function reportUploadError(
  file: File,
  err: unknown,
  requestLog?: RequestLogEntry[],
): void {
  fetch("/api/videos/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: err instanceof Error ? err.message : String(err),
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      connection: getConnectionInfo(),
      requestLog,
    }),
  }).catch(() => {});
}

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

// parseMp4Duration's own comments describe it as cheap regardless of file
// size — true for a file that's actually sitting on local storage, but
// found live: a video picked from an Android gallery can still be a
// cloud-sync stub (Google Photos on-demand backup) that isn't fully local
// yet, and Blob.slice().arrayBuffer() on it can silently block for MINUTES
// while the content provider fetches the bytes, rather than returning
// quickly or throwing. That's long enough to sit past a screen timeout or
// have Android throttle the backgrounded tab, so by the time this finally
// resolves the connection is already dead — which showed up as the actual
// upload's very first PATCH failing outright, for both a 330MB and a 76MB
// file, only after a long silent wait. There's no way to cancel an
// in-flight Blob read, but racing it against the same size-scaled timeout
// used for the <video>-element check at least stops it from blocking this
// function (and therefore the real upload attempt) indefinitely.
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
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

// Fire-and-forget, same reasoning as reportUploadError above — lets a
// disagreement between the two duration readings show up in Vercel's Logs
// tab instead of only ever being visible as "sometimes works, sometimes
// doesn't" from one vendor's phone.
function reportDurationMismatch(
  file: File,
  parsedDurationS: number | null,
  previewDurationS: number | null,
): void {
  fetch("/api/videos/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "duration-mismatch",
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      parsedDurationS,
      previewDurationS,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      connection: getConnectionInfo(),
    }),
  }).catch(() => {});
}

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
//
// A clean "ok" from the container parse short-circuits immediately (the
// common, fast path). But before ever REJECTING a video, this cross-checks
// against the <video>-element reading rather than trusting a single source
// — found live: the exact same file, picked twice in a row, read as over
// the cap once and correctly under it the next attempt. Almost certainly a
// transient read race on cloud-synced gallery videos (Android's on-demand
// download for Google Photos-backed files can still be mid-sync when the
// file picker hands the file over), not a real parsing bug — but there's no
// way to tell that apart from a genuinely too-long video using only one
// reading. So a rejection only stands when BOTH methods agree; either
// method alone is enough to let the video through, since blocking a
// vendor's listing on a flaky reading is far more costly than occasionally
// letting a slightly-too-long video slip past a soft, non-security cap.
export async function checkVideoDuration(
  file: File,
): Promise<VideoDurationCheck> {
  const parsedDurationS = await withTimeout(
    parseMp4Duration(file),
    videoMetadataTimeoutMs(file.size),
    null,
  );
  if (parsedDurationS != null && parsedDurationS <= MAX_VIDEO_DURATION_S) {
    return { kind: "ok" };
  }

  if (parsedDurationS == null) {
    console.warn(
      "[bunnyStream] Container-level duration parsing came up empty — falling back to the browser's <video> element",
    );
  }
  const previewDurationS = await readVideoElementDurationS(file);

  if (parsedDurationS != null) {
    // parsedDurationS was over the cap to get here — only reject if the
    // <video> element agrees (or itself can't read the file at all).
    if (previewDurationS == null || previewDurationS > MAX_VIDEO_DURATION_S) {
      if (previewDurationS != null) {
        reportDurationMismatch(file, parsedDurationS, previewDurationS);
      }
      return {
        kind: "over-limit",
        durationS: previewDurationS ?? parsedDurationS,
      };
    }
    reportDurationMismatch(file, parsedDurationS, previewDurationS);
    return { kind: "ok" };
  }

  // Container parse came up empty — fall back fully to the <video> element.
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
        const requestLogger = createRequestLogger();
        const upload = new Upload(file, {
          endpoint: TUS_ENDPOINT,
          // Diagnostic experiment (not a confirmed fix) for the
          // "PATCH offset 0" failures found live on weak mobile links: some
          // carriers/proxies handle POST more reliably than PATCH.
          // overridePatchMethod swaps every PATCH for a POST carrying
          // `X-HTTP-Method-Override: PATCH` instead, which Bunny's TUS
          // endpoint accepts identically. Safe to leave on — it's a
          // same-semantics wire-format change, not a behavior change.
          overridePatchMethod: true,
          onBeforeRequest: requestLogger.onBeforeRequest,
          onAfterResponse: requestLogger.onAfterResponse,
          // tus-js-client defaults chunkSize to Infinity — the WHOLE file
          // as one PATCH request body — which found live: a 331MB upload
          // over a weak 4G connection failing with "chunk at offset 0,
          // caused by [object ProgressEvent]" (a raw network-level error,
          // no HTTP response at all). Because nothing was acked yet, every
          // retry restarted the entire multi-minute transfer from scratch
          // instead of resuming past the last good byte. A flat 6MB chunk
          // helped but still wasn't small enough — found live via the new
          // /api/videos/log-error reports: a real failure at
          // downlink≈1.55Mbps still died on the first 6MB chunk, which at
          // that speed needs 30+ seconds to complete. Sizing the chunk to
          // the reported connection speed instead means a slow link gets a
          // small enough window to actually finish a PATCH before whatever
          // is killing the connection (carrier instability, OS network
          // throttling on a backgrounded tab) gets the chance to.
          chunkSize: chunkSizeForConnection(),
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
            reportUploadError(file, err, requestLogger.entries);
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
