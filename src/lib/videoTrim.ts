import { Upload } from "tus-js-client";

// Client-side trim for an over-length video, so a vendor with a 5-minute
// clip isn't just told "no" — they pick a 90s window and this uploads the
// untouched original straight to the video-trim service (a separate VM
// running native ffmpeg) via a resumable tus upload, then polls until that
// service has cut the clip and pushed the result to Bunny itself. Resolves
// with the final Bunny playback URL directly — nothing left for the caller
// to upload.
//
// This used to run entirely client-side via wasm ffmpeg (self-hosted core
// in public/ffmpeg/), but that turned out to be unreliable for the phones
// vendors actually record on: a 300-400MB clip routinely exceeded a
// low/mid-RAM Android's browser tab memory ceiling loading the whole file
// into wasm, on top of HEVC/moov-atom-position issues even just reading
// metadata (see VideoTrimModal's own metadata-timeout fallback).
export type TrimPhase = "uploading" | "processing";

const TRIM_STATUS_POLL_MS = 2000;
// 10 minutes — generous ceiling for a 600MB original on a slow connection
// plus server-side processing; anything past this is treated as stuck
// rather than left polling forever.
const TRIM_STATUS_MAX_WAIT_MS = 10 * 60 * 1000;

interface TrimAuthResponse {
  jobId: string;
  token: string;
  uploadUrl: string;
  statusUrl: string;
}

interface TrimJobStatus {
  status: "uploading" | "queued" | "trimming" | "pushing" | "done" | "error";
  progress?: number;
  bunnyUrl?: string;
  error?: string;
}

export async function trimVideoServerSide(
  file: File,
  startS: number,
  endS: number,
  onProgress?: (phase: TrimPhase, pct: number) => void,
): Promise<string> {
  const authRes = await fetch("/api/videos/trim-auth", { method: "POST" });
  if (!authRes.ok) {
    throw new Error("Couldn't start server-side trimming");
  }
  const { jobId, token, uploadUrl, statusUrl } =
    (await authRes.json()) as TrimAuthResponse;

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: uploadUrl,
      headers: { Authorization: `Bearer ${token}` },
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: {
        jobId,
        startS: String(startS),
        endS: String(endS),
        filename: file.name,
        filetype: file.type || "video/mp4",
      },
      onError: (err) =>
        reject(err instanceof Error ? err : new Error(String(err))),
      onProgress: (bytesSent, bytesTotal) => {
        onProgress?.("uploading", bytesTotal > 0 ? bytesSent / bytesTotal : 0);
      },
      onSuccess: () => resolve(),
    });
    upload.start();
  });

  const deadline = Date.now() + TRIM_STATUS_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(statusUrl);
    if (res.ok) {
      const job = (await res.json()) as TrimJobStatus;
      if (job.status === "done" && job.bunnyUrl) return job.bunnyUrl;
      if (job.status === "error") {
        throw new Error(
          job.error || "Couldn't process this video on the server",
        );
      }
      onProgress?.("processing", (job.progress ?? 0) / 100);
    }
    await new Promise((r) => setTimeout(r, TRIM_STATUS_POLL_MS));
  }
  throw new Error("Timed out waiting for the video to finish processing");
}
