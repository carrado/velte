import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/server/guards";

// POST /api/videos/log-error — the browser can't write to Vercel's own
// function logs directly (those only capture server-side stdout/stderr), so
// a client-side upload failure (see bunnyStream.ts's uploadVideoToBunny)
// would otherwise only ever show up in that one vendor's own DevTools
// console, invisible to anyone else — the exact gap that made a
// mobile-only, offset-0 TUS failure impossible to diagnose without physical
// device access. This just relays it into a console.error here so it lands
// in Vercel's Logs tab like any other server-side error — no new
// third-party service, just routing the report through infrastructure
// that's already there.
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return jsonError(400, "Invalid error report");
  }

  // Deliberately unstructured beyond attaching userId/time — this exists to
  // get a human-readable diagnostic dump in front of a developer, not to
  // feed a typed analytics pipeline. Never let a malformed field here throw
  // and swallow the real report.
  console.error("[video-upload-error]", {
    userId: gate.userId,
    ...body,
    reportedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
