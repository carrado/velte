import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/guards";
import { createSignedBunnyUpload } from "@/lib/server/bunny";

// POST /api/videos/bunny-upload-auth-internal — server-to-server twin of
// bunny-upload-auth, called by the video-trim service (a separate VM, not a
// vendor's browser) once it has cut a clip down to size. That service has no
// user session cookie to present, so it authenticates with a shared secret
// instead of requireAuth(). Never expose this route's existence to the
// browser bundle — it's not linked from any client code, only from the trim
// service's server-side pushToBunny step.
function isAuthorized(req: Request): boolean {
  const secret = process.env.TRIM_SERVICE_INTERNAL_SECRET;
  const provided = req.headers.get("x-internal-secret");
  if (!secret || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return jsonError(401, "Not authorized");

  const body = (await req.json().catch(() => null)) as {
    title?: string;
  } | null;
  const title = body?.title?.trim() || "Product video";

  try {
    const signed = await createSignedBunnyUpload(title);
    return NextResponse.json(signed);
  } catch (err) {
    console.error("[bunny-upload-auth-internal] create video failed:", err);
    return jsonError(502, "Couldn't start the video upload — try again.");
  }
}
