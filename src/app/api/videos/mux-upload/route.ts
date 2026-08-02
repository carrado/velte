import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { mux } from "@/lib/server/mux";

// POST /api/videos/mux-upload — mints a Mux direct-upload URL. The client
// PUTs the video straight to `uploadUrl` (via @mux/mux-uploader-react),
// never touching MUX_TOKEN_ID/SECRET.
export async function POST(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const upload = await mux.video.uploads.create({
      cors_origin: req.nextUrl.origin,
      new_asset_settings: { playback_policies: ["public"] },
    });
    return NextResponse.json({ uploadId: upload.id, uploadUrl: upload.url });
  } catch (err) {
    return fail(err, "Failed to start video upload.");
  }
}
