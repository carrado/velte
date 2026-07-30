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

// How many parts upload at once. Higher uses more of a real connection's
// available bandwidth than one sequential stream (the whole point of this
// rewrite) — but too high just adds contention on a weak mobile uplink
// instead of helping. 5 is a starting point, not a measured optimum; see
// the trim-service README's "Sizing the worker pool" for how to actually
// find one.
const PART_UPLOAD_CONCURRENCY = 5;
// A part failing outright (not just slow — a dropped connection, a 5xx) is
// worth a few quick retries before giving up the whole upload over what's
// often a transient blip, especially on mobile.
const PART_UPLOAD_MAX_ATTEMPTS = 3;

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

async function putPartWithRetry(
  url: string,
  blob: Blob,
  onBytes: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= PART_UPLOAD_MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw abortError();
    try {
      return await putPart(url, blob, onBytes, signal);
    } catch (err) {
      if (signal?.aborted) throw abortError();
      lastErr = err;
      onBytes(0); // this attempt's progress didn't count — reset before retrying
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// Runs `worker` over `items` with at most `concurrency` in flight at once —
// a small fixed-size pool rather than chunking into batches, so a fast part
// finishing early immediately picks up the next one instead of waiting on
// the slowest part in its batch.
async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  async function runNext(): Promise<void> {
    const i = nextIndex++;
    if (i >= items.length) return;
    await worker(items[i]);
    return runNext();
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runNext),
  );
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
    await runPool(
      parts,
      PART_UPLOAD_CONCURRENCY,
      async ({ partNumber, url }) => {
        const start = (partNumber - 1) * partSize;
        const blob = file.slice(start, Math.min(start + partSize, file.size));
        const index = partNumber - 1;
        const etag = await putPartWithRetry(
          url,
          blob,
          (loaded) => {
            partBytes[index] = loaded;
            reportUploadProgress();
          },
          signal,
        );
        uploadedParts[index] = { partNumber, etag };
      },
    );

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
