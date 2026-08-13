import { NextResponse } from "next/server";
import shortLinks from "@/data/vendor-signup-shortlinks.json";
import { backendData, BackendError } from "@/lib/server/backend";

// Branded short-link redirector — velte.ng/s/<code> instead of a long
// destination URL, so WhatsApp/SMS messages read cleanly and don't look like
// phishing links. Originally just vendor signup invites (see
// scripts/generate-signup-links.js), now also used for other vendor deep
// links (e.g. velte-backend/scripts/nudge-list.mjs's "add a listing" nudge)
// — any script may add entries here as long as they share this one flat
// code->url map. `shortLinks` is a static JSON import (bundled at build
// time, not read from disk at request time), so a new batch of codes only
// goes live after the generating script updates this file and it's
// committed + deployed — there's no runtime write path.
//
// A code not found in the static map falls through to a LIVE lookup
// (GET /api/shortlinks/:code, backed by velte-backend's ShortLink
// collection) before giving up — added 2026-08-06 for velte-super-admin's
// Nudge Campaign page, which edits and sends messages live from an admin
// panel and can't wait on a frontend deploy every time a new code is
// needed. Static-first, not live-first: the static path is zero-latency and
// covers the overwhelming majority of codes (every terminal-script batch),
// so there's no reason to pay a network round trip for those.
//
// An unrecognized code (in neither place) still lands somewhere useful — the
// bare signup page, no prefill — rather than a dead end.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const staticDestination = (shortLinks as Record<string, string>)[code];

  if (staticDestination) {
    return NextResponse.redirect(new URL(staticDestination, req.url), {
      status: 302,
    });
  }

  try {
    const { url } = await backendData<{ url: string }>(
      `/shortlinks/${encodeURIComponent(code)}`,
    );
    return NextResponse.redirect(url, { status: 302 });
  } catch (err) {
    if (!(err instanceof BackendError)) {
      console.error(`[s/${code}] live shortlink lookup failed:`, err);
    }
    return NextResponse.redirect(new URL("/auth/signup", req.url), {
      status: 302,
    });
  }
}
