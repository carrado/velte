import { NextResponse } from "next/server";

import { fail, unauthorized } from "@/lib/server/guards";
import { pushSession } from "@/lib/server/pushSession";
import { backendFetch } from "@/lib/server/backend";

// POST /api/push/subscribe   body: { subscription }
export async function POST(req: Request) {
  // Either kind of account (2026-09-24) — see pushSession.
  const gate = await pushSession();
  if (!gate) return unauthorized();
  const body = await req.json().catch(() => ({}));
  try {
    await backendFetch("/push/subscribe", {
      method: "POST",
      body,
      cookie: gate.cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to subscribe to push.");
  }
}
