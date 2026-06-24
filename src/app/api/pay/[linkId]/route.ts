import { NextRequest, NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail } from "@/lib/server/guards";
import type { PayLinkData } from "@/types/pay";

// GET /api/pay/:linkId?ref=   (public — the linkId is the capability)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;
  const ref = req.nextUrl.searchParams.get("ref");
  const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  try {
    const data = await backendData<PayLinkData>(
      `/pay/${encodeURIComponent(linkId)}${qs}`,
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Failed to load payment link.");
  }
}
