// Client-side trim for an over-length video, so a vendor with a 5-minute
// clip isn't just told "no" — they pick a 90s window and this uploads the
// untouched original straight to Cloudflare R2 (a real native ffmpeg on a
// separate VM does the actual cut, reading the original back off R2 over
// HTTPS rather than this app ever touching the raw bytes), then polls until
// that service has cut the clip and written it back to R2 under its
// permanent, publicly-served key. Resolves with that final R2 URL directly
// — nothing left for the caller to upload, and nothing here talks to Bunny
// at all anymore (see the trim-service's processJob.js — R2 is both the
// scratch destination for the original and the permanent home for the
// finished clip).
//
// This used to run entirely client-side via wasm ffmpeg (self-hosted core
// in public/ffmpeg/), but that turned out to be unreliable for the phones
// vendors actually record on: a 300-400MB clip routinely exceeded a
// low/mid-RAM Android's browser tab memory ceiling loading the whole file
// into wasm, on top of HEVC/moov-atom-position issues even just reading
// metadata (see bunnyStream.ts's checkVideoDuration).
//
// The upload itself went through one more revision after that: originally
// a single resumable tus stream relayed through the trim-service VM (which
// re-uploaded it to R2 internally). That worked but wasted a full network
// hop moving the same bytes twice, and a single sequential stream can't
// fill the bandwidth most real connections actually have available. This
// version instead PUTs several chunks of the original straight to R2 in
// parallel via short-lived presigned URLs — the trim-service VM never sees
// the video bytes on the way in at all, only two small JSON requests
// (start the upload, confirm it finished).
export type TrimPhase = "uploading" | "processing";

const TRIM_STATUS_POLL_MS = 2000;
// 10 minutes — this only bounds the POST-upload wait (trim + push back to
// R2), not the upload itself (which has no timeout of its own — a vendor's
// upload just runs until it succeeds or a part exhausts its retries). Since
// ffmpeg only ever reads the trim window back out regardless of how big the
// original was (see the trim-service's ffmpegTrim.js), this processing step
// isn't expected to scale with the original's size — 10 minutes is already
// generous margin, past which it's treated as stuck rather than left
// polling forever.
const TRIM_STATUS_MAX_WAIT_MS = 10 * 60 * 1000;

// How many parts upload at once — adapts between these bounds instead of
// staying fixed (see runAdaptivePool below). Starts conservative, ramps up
// on a run of clean batches (a strong desktop/WiFi connection earns back
// real parallelism), and drops back down hard the moment a part needs a
// retry. Found live: a 400MB+ video upload over a phone's WiFi routinely
// failed parts at a fixed concurrency of 5 (weaker phone WiFi radio, or
// budget-device memory pressure, hammered simultaneously by 5 large
// transfers) even though the same file uploaded fine from a desktop on the
// same network. A fixed concurrency has to pick one of "fast on a strong
// connection" or "reliable on a weak one" — adapting gets both. None of
// these three numbers are a measured optimum; see the trim-service README's
// "Sizing the worker pool" for how to actually find one.
const PART_UPLOAD_MIN_CONCURRENCY = 1;
const PART_UPLOAD_START_CONCURRENCY = 3;
const PART_UPLOAD_MAX_CONCURRENCY = 5;
// How many consecutive retry-free batches earn back one more slot of
// parallelism — high enough that a single lucky batch right after a drop
// doesn't immediately ramp back up to the concurrency that just failed.
const RAMP_UP_CLEAN_BATCHES = 2;

// A part failing outright (not just slow — a dropped connection, a 5xx) is
// worth a few quick retries before giving up the whole upload over what's
// often a transient blip, especially on mobile.
const PART_UPLOAD_MAX_ATTEMPTS = 3;
// Paused between retry attempts (not before the first try) — retrying a
// network failure instantly, while the other parts in the same batch are
// still actively hammering the same constrained connection/device, doesn't
// give a transient blip (a brief signal drop, a momentary memory squeeze)
// any real chance to clear before trying again.
const PART_RETRY_BACKOFF_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TrimAuthResponse {
  jobId: string;
  token: string;
  initUrl: string;
  completeUrl: string;
  statusUrl: string;
  cancelUrl: string;
}

interface InitUploadResponse {
  r2Key: string;
  partSize: number;
  parts: { partNumber: number; url: string }[];
}

interface TrimJobStatus {
  status:
    | "uploading"
    | "queued"
    | "trimming"
    | "pushing"
    | "done"
    | "error"
    | "cancelled";
  progress?: number;
  videoUrl?: string;
  error?: string;
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

// XMLHttpRequest, not fetch, deliberately — it's the only one of the two
// with an upload progress event, and per-part byte-level progress is what
// keeps the modal's progress bar smooth instead of jumping once every
// ~16MB part.
function putPart(
  url: string,
  blob: Blob,
  onBytes: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onBytes(e.loaded);
    };
    const onAbort = () => {
      xhr.abort();
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort);
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    xhr.onload = () => {
      cleanup();
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Part upload failed: HTTP ${xhr.status}`));
        return;
      }
      const etag = xhr.getResponseHeader("ETag");
      if (!etag) {
        // Most likely the R2 bucket's CORS policy doesn't list ETag under
        // ExposeHeaders — see the trim-service README's Cloudflare R2 setup
        // section. The part genuinely uploaded; this browser just can't
        // read the header it needs to tell R2 which parts to assemble.
        reject(new Error("Part uploaded but response was missing an ETag"));
        return;
      }
      onBytes(blob.size);
      resolve(etag);
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Part upload network error"));
    };
    xhr.send(blob);
  });
}

// `neededRetry` tells the caller (runAdaptivePool) whether this part came
// back clean on the first try or needed intervention — that's the signal
// concurrency adapts on, not just pass/fail.
async function putPartWithRetry(
  url: string,
  blob: Blob,
  onBytes: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<{ etag: string; neededRetry: boolean }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= PART_UPLOAD_MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw abortError();
    if (attempt > 1) await sleep(PART_RETRY_BACKOFF_MS * (attempt - 1));
    try {
      const etag = await putPart(url, blob, onBytes, signal);
      return { etag, neededRetry: attempt > 1 };
    } catch (err) {
      if (signal?.aborted) throw abortError();
      lastErr = err;
      onBytes(0); // this attempt's progress didn't count — reset before retrying
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// Runs `worker` over `items` in batches whose size adapts between
// PART_UPLOAD_MIN_CONCURRENCY and PART_UPLOAD_MAX_CONCURRENCY (see those
// constants' own comment) — halves the moment any part in a batch needed a
// retry, grows by one slot after RAMP_UP_CLEAN_BATCHES clean batches in a
// row. Simpler than a continuously-resizing worker pool (a batch waits on
// its slowest part before the next one starts, rather than a fast part
// immediately picking up the next item) — costs a little throughput for
// code that's easy to reason about, worth it here since a real upload is
// only ever tens of parts, not thousands.
async function runAdaptivePool<T>(
  items: T[],
  worker: (item: T) => Promise<{ neededRetry: boolean }>,
): Promise<void> {
  let concurrency = PART_UPLOAD_START_CONCURRENCY;
  let cleanStreak = 0;
  let index = 0;

  while (index < items.length) {
    const batch = items.slice(index, index + concurrency);
    index += batch.length;

    const results = await Promise.all(batch.map((item) => worker(item)));
    const anyRetried = results.some((r) => r.neededRetry);

    if (anyRetried) {
      concurrency = Math.max(
        PART_UPLOAD_MIN_CONCURRENCY,
        Math.floor(concurrency / 2),
      );
      cleanStreak = 0;
    } else {
      cleanStreak++;
      if (
        cleanStreak >= RAMP_UP_CLEAN_BATCHES &&
        concurrency < PART_UPLOAD_MAX_CONCURRENCY
      ) {
        concurrency++;
        cleanStreak = 0;
      }
    }
  }
}

// `signal` lets a caller cancel mid-flight (AddProductPage's floating
// progress bar's Cancel button). Cancelling doesn't just stop this function
// from resolving — it also tells the trim-service to clean up server-side
// (abort the R2 multipart upload, or delete the pushed clip if it already
// finished), via a best-effort POST to `cancelUrl` once one was actually
// minted (nothing to clean up if the signal fired before /api/videos/trim-
// auth even returned).
export async function trimVideoServerSide(
  file: File,
  startS: number,
  endS: number,
  onProgress?: (phase: TrimPhase, pct: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw abortError();

  const authRes = await fetch("/api/videos/trim-auth", {
    method: "POST",
    signal,
  });
  if (!authRes.ok) {
    throw new Error("Couldn't start server-side trimming");
  }
  const { token, initUrl, completeUrl, statusUrl, cancelUrl } =
    (await authRes.json()) as TrimAuthResponse;

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const notifyCancelled = () => {
    fetch(cancelUrl, { method: "POST", headers: authHeaders }).catch(() => {});
  };

  try {
    const initRes = await fetch(initUrl, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        contentType: file.type || "video/mp4",
        fileSize: file.size,
        startS,
        endS,
      }),
      signal,
    });
    if (!initRes.ok) {
      throw new Error("Couldn't start the upload");
    }
    const { partSize, parts } = (await initRes.json()) as InitUploadResponse;

    const partBytes = new Array<number>(parts.length).fill(0);
    const reportUploadProgress = () => {
      const loaded = partBytes.reduce((sum, n) => sum + n, 0);
      onProgress?.("uploading", file.size > 0 ? loaded / file.size : 0);
    };

    const uploadedParts: { partNumber: number; etag: string }[] = new Array(
      parts.length,
    );
    await runAdaptivePool(parts, async ({ partNumber, url }) => {
      const start = (partNumber - 1) * partSize;
      const blob = file.slice(start, Math.min(start + partSize, file.size));
      const index = partNumber - 1;
      const { etag, neededRetry } = await putPartWithRetry(
        url,
        blob,
        (loaded) => {
          partBytes[index] = loaded;
          reportUploadProgress();
        },
        signal,
      );
      uploadedParts[index] = { partNumber, etag };
      return { neededRetry };
    });

    const completeRes = await fetch(completeUrl, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ parts: uploadedParts }),
      signal,
    });
    if (!completeRes.ok) {
      throw new Error("Couldn't finish the upload");
    }

    const deadline = Date.now() + TRIM_STATUS_MAX_WAIT_MS;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw abortError();
      const res = await fetch(statusUrl, { signal });
      if (res.ok) {
        const job = (await res.json()) as TrimJobStatus;
        if (job.status === "done" && job.videoUrl) return job.videoUrl;
        if (job.status === "error") {
          throw new Error(
            job.error || "Couldn't process this video on the server",
          );
        }
        if (job.status === "cancelled") throw abortError();
        onProgress?.("processing", (job.progress ?? 0) / 100);
      }
      await new Promise((r) => setTimeout(r, TRIM_STATUS_POLL_MS));
    }
    throw new Error("Timed out waiting for the video to finish processing");
  } catch (err) {
    if (
      signal?.aborted ||
      (err instanceof DOMException && err.name === "AbortError")
    ) {
      notifyCancelled();
      throw abortError();
    }
    throw err;
  }
}
