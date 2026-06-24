import { NextResponse } from "next/server";

import { backendData, BackendError } from "@/lib/server/backend";
import { jsonError } from "@/lib/server/guards";
import type { TrackOrderData } from "@/types/track";

// POST /api/track/:token   body: { key }   (public — token + key is the capability)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const data = await backendData<TrackOrderData>(
      `/track/${encodeURIComponent(token)}`,
      { method: "POST", body },
    );
    return NextResponse.json(data);
  } catch (err) {
    // Surface the upstream status (e.g. 403 wrong key, 404 unknown token).
    if (err instanceof BackendError) return jsonError(err.status, err.message);
    return jsonError(500, "Failed to track order.");
  }
}
