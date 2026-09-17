import { NextResponse } from "next/server";

import {
  AiSearchBackendError,
  aiSearchFetch,
} from "@/lib/server/aiSearchBackend";

// POST — records that a buyer tapped "Message on Instagram" on an Instagram
// lead card (2026-09-16), as a recruitment lead with a reach-out count.
// Fired from InstagramLeadCard as a best-effort beacon RIGHT as the DM
// thread is opening, so this must accept sendBeacon's plain JSON POST and
// never matter if it's lost — same contract as the conversation handoff
// beacon. Public: the buyer may be a guest, and the only thing written is a
// public business's handle plus what was searched, never anything about
// the buyer. Field lengths are capped so a stray beacon can't pad the
// recruitment queue with junk.
const MAX_FIELD = 300;

function clip(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, MAX_FIELD)
    : null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    handle?: string;
    url?: string;
    title?: string;
    need?: string;
    location?: string | null;
  } | null;

  const handle = clip(body?.handle);
  if (!handle || !/^[A-Za-z0-9._]{1,64}$/.test(handle)) {
    return NextResponse.json(
      { error: "A valid Instagram handle is required." },
      { status: 400 },
    );
  }

  try {
    await aiSearchFetch("/search/log/instagram-reachout", {
      method: "POST",
      body: {
        handle,
        url: clip(body?.url),
        title: clip(body?.title),
        need: clip(body?.need),
        location: clip(body?.location),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AiSearchBackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[search/instagram-reachout] log failed:", err);
    return NextResponse.json(
      { error: "Couldn't record the reach-out." },
      { status: 502 },
    );
  }
}
