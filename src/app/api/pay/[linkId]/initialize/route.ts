import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail } from "@/lib/server/guards";
import type { InitializePayResponse } from "@/types/pay";

// POST /api/pay/:linkId/initialize   (public)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const data = await backendData<InitializePayResponse>(
      `/pay/${encodeURIComponent(linkId)}/initialize`,
      { method: "POST", body },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Failed to initialize payment.");
  }
}
