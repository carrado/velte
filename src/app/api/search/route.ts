import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { RawSearchResponse } from "@/types/search";

// GET /api/search?q=&limit=
export async function GET(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const qs = req.nextUrl.searchParams.toString();
  try {
    const results = await backendData<RawSearchResponse["data"]>(
      `/search${qs ? `?${qs}` : ""}`,
      { cookie: gate.cookie },
    );
    return NextResponse.json(results);
  } catch (err) {
    return fail(err, "Search failed.");
  }
}
