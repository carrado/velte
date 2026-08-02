import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { mux, muxPlaybackUrl } from "@/lib/server/mux";
import { MAX_VIDEO_SECONDS } from "@/lib/video-limits";

type Ctx = { params: Promise<{ uploadId: string }> };

// GET /api/videos/mux-upload/:uploadId — polled by the client after the
// direct upload finishes. Mux only creates the asset once the upload
// completes, and only finishes encoding a moment after that — so this
// walks upload -> asset -> playback URL and reports whichever stage it's at.
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { uploadId } = await params;

  try {
    const upload = await mux.video.uploads.retrieve(uploadId);

    if (upload.status === "errored" || upload.status === "cancelled") {
      return jsonError(422, upload.error?.message ?? "Video upload failed.");
    }
    if (!upload.asset_id) {
      // Still "waiting" or "timed_out" with no asset yet.
      return NextResponse.json({ status: "waiting" as const });
    }

    const asset = await mux.video.assets.retrieve(upload.asset_id);
    if (asset.status === "errored") {
      return jsonError(422, "Video processing failed.");
    }
    if (asset.status !== "ready") {
      return NextResponse.json({ status: "preparing" as const });
    }

    // Real enforcement of the duration cap — the client-side check is
    // best-effort (some phones/codecs never let us read it beforehand) and
    // fails open, so this is what actually stops an oversized video landing
    // on a listing.
    if (asset.duration && asset.duration > MAX_VIDEO_SECONDS) {
      await mux.video.assets.delete(upload.asset_id).catch(() => {});
      return jsonError(
        422,
        `Video is ${Math.round(asset.duration)}s — keep it under ${MAX_VIDEO_SECONDS} seconds.`,
      );
    }

    const playbackId = asset.playback_ids?.find(
      (p) => p.policy === "public",
    )?.id;
    if (!playbackId) return jsonError(422, "No public playback URL.");

    return NextResponse.json({
      status: "ready" as const,
      videoUrl: muxPlaybackUrl(playbackId),
    });
  } catch (err) {
    return fail(err, "Failed to check video upload status.");
  }
}
