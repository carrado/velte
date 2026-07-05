import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { connectCatalog } from "@/lib/server/store";

// POST /api/store/connect-catalog — connect the vendor's own website so Velte
// can sync-mirror their catalog (spec §16.1). The upstream probes the site to
// detect the platform and count products.
export async function POST(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const body = await req.json().catch(() => null);
  const sourceUrl =
    body && typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  if (!sourceUrl) {
    return NextResponse.json(
      { error: "Enter your website address." },
      { status: 400 },
    );
  }

  try {
    const catalog = await connectCatalog(sourceUrl, gate.cookie);
    return NextResponse.json({ catalog });
  } catch (err) {
    return fail(err, "Couldn't connect your website. Please try again.");
  }
}
