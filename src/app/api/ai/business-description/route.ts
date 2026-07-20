import { NextRequest, NextResponse } from "next/server";
import { jsonError, fail } from "@/lib/server/guards";
import { generateBusinessDescription } from "@/lib/server/ai/generateBusinessDescription";
import { SECTOR_BY_VALUE } from "@/lib/sectors";

// POST /api/ai/business-description   (public — used pre-account, during signup)
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    businessName?: string;
    sectorValues?: string[];
  } | null;

  const businessName = body?.businessName?.trim();
  const sectors = (body?.sectorValues ?? [])
    .map((v) => SECTOR_BY_VALUE[v])
    .filter((s) => s != null);

  if (!businessName) return jsonError(400, "businessName is required.");
  if (!sectors.length)
    return jsonError(400, "At least one valid sectorValue is required.");

  try {
    const description = await generateBusinessDescription({
      businessName,
      sectors: sectors.map((s) => ({
        label: s.label,
        classification: s.classification,
      })),
    });
    return NextResponse.json({ description });
  } catch (err) {
    return fail(err, "Couldn't generate a description right now.");
  }
}
