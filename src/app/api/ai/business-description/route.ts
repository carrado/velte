import { NextRequest, NextResponse } from "next/server";
import { jsonError, fail } from "@/lib/server/guards";
import { generateBusinessDescription } from "@/lib/server/ai/generateBusinessDescription";
import { SECTOR_BY_VALUE } from "@/lib/sectors";

// POST /api/ai/business-description   (public — used pre-account, during signup)
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    businessName?: string;
    sectorValue?: string;
  } | null;

  const businessName = body?.businessName?.trim();
  const sector = body?.sectorValue
    ? SECTOR_BY_VALUE[body.sectorValue]
    : undefined;

  if (!businessName) return jsonError(400, "businessName is required.");
  if (!sector) return jsonError(400, "A valid sectorValue is required.");

  try {
    const description = await generateBusinessDescription({
      businessName,
      sectorLabel: sector.label,
      classification: sector.classification,
    });
    return NextResponse.json({ description });
  } catch (err) {
    return fail(err, "Couldn't generate a description right now.");
  }
}
