import { NextRequest, NextResponse } from "next/server";
import { jsonError, fail } from "@/lib/server/guards";
import { assessDescriptionQuality } from "@/lib/server/ai/assessDescriptionQuality";
import { SECTOR_BY_VALUE } from "@/lib/sectors";

// POST /api/ai/description-quality   (public — called from both signup,
// pre-account, and the authenticated Store editor; same reasoning as
// business-description's own route: no session to gate on at signup time,
// and nothing here is sensitive). Debounced client-side (see
// DescriptionQualityMeter.tsx) to ~5s after typing stops, not on every
// keystroke.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    description?: string;
    sectorValues?: string[];
  } | null;

  const description = body?.description?.trim();
  if (!description) return jsonError(400, "description is required.");

  const sectors = (body?.sectorValues ?? [])
    .map((v) => SECTOR_BY_VALUE[v])
    .filter((s) => s != null);

  try {
    const assessment = await assessDescriptionQuality({
      description,
      sectors: sectors.map((s) => ({
        label: s.label,
        classification: s.classification,
      })),
    });
    return NextResponse.json(assessment);
  } catch (err) {
    return fail(err, "Couldn't check description quality right now.");
  }
}
