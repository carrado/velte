import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/server/guards";
import { deleteBunnyVideo } from "@/lib/server/bunny";

// DELETE /api/videos/:videoId — fired by uploadVideoToBunny (bunnyStream.ts)
// when a vendor cancels a still-in-flight direct upload. The Bunny video
// container already exists by this point (created at bunny-upload-auth
// time, before a single byte moved) — this is what actually removes it,
// rather than just walking away from the TUS upload client-side and
// leaving an orphaned, partially-uploaded video sitting in the library.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const { videoId } = await params;
  if (!/^[a-f0-9-]{20,}$/i.test(videoId)) {
    return jsonError(400, "Invalid video id");
  }

  try {
    await deleteBunnyVideo(videoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[videos DELETE] Bunny delete failed:", err);
    return jsonError(502, "Couldn't delete this video");
  }
}
