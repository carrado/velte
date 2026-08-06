import { NextResponse } from "next/server";
import shortLinks from "@/data/vendor-signup-shortlinks.json";

// Branded short-link redirector — velte.ng/s/<code> instead of a long
// destination URL, so WhatsApp/SMS messages read cleanly and don't look like
// phishing links. Originally just vendor signup invites (see
// scripts/generate-signup-links.js), now also used for other vendor deep
// links (e.g. velte-backend/scripts/nudge-list.mjs's "add a listing" nudge)
// — any script may add entries here as long as they share this one flat
// code->url map. `shortLinks` is a static JSON import (bundled at build
// time, not read from disk at request time), so a new batch of codes only
// goes live after the generating script updates this file and it's
// committed + deployed — there's no runtime write path. An unrecognized/
// expired code still gets somewhere useful rather than a dead end: the bare
// signup page, no prefill.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const destination = (shortLinks as Record<string, string>)[code];
  return NextResponse.redirect(
    new URL(destination ?? "/auth/signup", req.url),
    {
      status: 302,
    },
  );
}
