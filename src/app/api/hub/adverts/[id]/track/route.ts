import { NextResponse } from "next/server";
import { backendData } from "@/lib/server/backend";
import { notificationSession } from "@/lib/server/notificationSession";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/hub/adverts/:id/track — records a view or click with per-actor dedup
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const session = await notificationSession();
  const body = (await req.json().catch(() => null)) as {
    kind?: "view" | "click";
  } | null;

  try {
    const data = await backendData(`/hub/adverts/${id}/track`, {
      method: "POST",
      body: { kind: body?.kind === "click" ? "click" : "view" },
      cookie: session?.cookie,
    });
    return NextResponse.json(data);
  } catch {
    // Analytics tracking is always non-blocking / best-effort
    return NextResponse.json({ success: false });
  }
}
