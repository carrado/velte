import { NextResponse } from "next/server";
import shortLinks from "@/data/vendor-signup-shortlinks.json";

// Branded short-link redirector for vendor signup invites (see
// scripts/generate-signup-links.js) — velte.ng/s/<code> instead of a long
// pre-filled /auth/signup URL, so the WhatsApp message reads cleanly and
// doesn't look like a phishing link. `shortLinks` is a static JSON import
// (bundled at build time, not read from disk at request time), so a new
// batch of codes only goes live after generate-signup-links.js regenerates
// this file and it's committed + deployed — there's no runtime write path.
// An unrecognized/expired code still gets somewhere useful rather than a
// dead end: the bare signup page, no prefill.
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
