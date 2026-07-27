import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// Client-side trim for an over-length video, so a vendor with a 5-minute
// clip isn't just told "no" — they pick a 90s window and this cuts it down
// before it ever reaches uploadVideoToBunny(). Stream-copy only (`-c copy`):
// no re-encoding, so it's fast and lossless even on a weak phone, at the
// cost of snapping to the nearest keyframe (~1-2s drift from the exact
// picked window) and NOT fixing an unsupported source codec (see the MJPEG
// case this app has already hit) — a trimmed MJPEG file is still MJPEG.
// Self-hosted (public/ffmpeg/, copied from @ffmpeg/core's dist/umd at
// install time) rather than pulled from unpkg — the CDN round-trip was
// adding a visible "Loading video engine…" wait even for vendors who moved
// fast, since preloadFFmpeg's warm-up had to fight cold CDN latency instead
// of just hitting the app's own edge cache.
const CORE_BASE_URL = "/ffmpeg";

let ffmpegPromise: Promise<FFmpeg> | null = null;

// Lazy singleton — the ~30MB wasm core is never part of the app's main
// bundle. It's fetched once per session, kicked off by preloadFFmpeg() as
// soon as the vendor lands on the Add/Edit product page (see
// AddProductPage's mount effect) rather than waiting for a video to be
// picked, so it's usually already warm by the time the trim modal opens.
function loadFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${CORE_BASE_URL}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${CORE_BASE_URL}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });
      return ffmpeg;
    })().catch((err) => {
      // Don't permanently cache a failed load — a transient network blip
      // fetching the core shouldn't brick trimming for the rest of the
      // session, so the next attempt gets a clean retry.
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}

// Called both from AddProductPage on mount (the real warm-up) and again from
// the trim modal on open as a safety net for edit-mode deep links or a
// failed first attempt — loadFFmpeg()'s singleton promise means the second
// call is a no-op once the first has succeeded. Resolves (never rejects) so
// callers can use it purely to flip a "ready" flag; trimVideo() below does
// its own retrying load regardless of whether this succeeded.
export function preloadFFmpeg(): Promise<boolean> {
  return loadFFmpeg().then(
    () => true,
    () => false,
  );
}

// mp4/mov share a container family (both ISO base media) — a mov's H.264/
// HEVC streams remux into an .mp4 via stream copy with no issue. webm's
// VP8/VP9/Opus streams can't live in an mp4 container at all, so that one
// has to keep its own container or the copy-remux fails outright.
function outputExtension(file: File): "mp4" | "webm" {
  return file.type === "video/webm" || file.name.toLowerCase().endsWith(".webm")
    ? "webm"
    : "mp4";
}

export interface TrimResult {
  file: File;
}

export async function trimVideo(
  file: File,
  startS: number,
  endS: number,
  onProgress?: (pct: number) => void,
): Promise<File> {
  const ffmpeg = await loadFFmpeg();

  const ext = outputExtension(file);
  const inputName = `input.${ext === "webm" ? "webm" : "mov"}`;
  const outputName = `trimmed.${ext}`;

  const progressHandler = ({ progress }: { progress: number }) => {
    // ffmpeg reports progress as a 0..1 fraction of the trimmed duration —
    // occasionally spikes slightly over 1 near the very end, clamp it.
    onProgress?.(Math.min(1, Math.max(0, progress)));
  };

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  ffmpeg.on("progress", progressHandler);

  try {
    await ffmpeg.exec([
      // Input-side -ss/-to: fast keyframe seek (doesn't decode everything
      // up to the start point, which matters at 500MB+ on a phone), both
      // values are absolute positions in the ORIGINAL timeline.
      "-ss",
      String(startS),
      "-to",
      String(endS),
      "-i",
      inputName,
      "-c",
      "copy",
      // Cut segments can start on a non-zero base timestamp after a
      // keyframe seek — this resets it so playback starts cleanly at 0
      // instead of some players showing a black gap or misreported duration.
      "-avoid_negative_ts",
      "make_zero",
      ...(ext === "mp4" ? ["-movflags", "+faststart"] : []),
      outputName,
    ]);
  } finally {
    ffmpeg.off("progress", progressHandler);
  }

  const data = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const mimeType = ext === "webm" ? "video/webm" : "video/mp4";
  const blob = new Blob([data as unknown as BlobPart], { type: mimeType });
  return new File([blob], file.name, { type: mimeType });
}
