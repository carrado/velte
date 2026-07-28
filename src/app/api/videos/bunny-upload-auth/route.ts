import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/server/guards";
import { createSignedBunnyUpload } from "@/lib/server/bunny";

// POST /api/videos/bunny-upload-auth   (authenticated — Add-Offering wizard's
// video tab). Bunny Stream has no unsigned-upload-preset equivalent to
// Cloudinary's — every upload needs a per-video signature computed from the
// account's secret API key, which can only ever happen server-side. This
// route is that one server-side step: create the video "container" on Bunny
// (their Create Video API), compute the signature their TUS endpoint expects,
// and hand the vendor's browser just enough to perform the actual upload
// directly against Bunny (never through this server) via tus-js-client. The
// signature is scoped to this one videoId and expires in an hour — nothing
// returned here is the real secret.
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => null)) as {
    title?: string;
  } | null;
  const title = body?.title?.trim() || "Product video";

  try {
    const signed = await createSignedBunnyUpload(title);
    return NextResponse.json(signed);
  } catch (err) {
    console.error("[bunny-upload-auth] create video failed:", err);
    return jsonError(502, "Couldn't start the video upload — try again.");
  }
}
