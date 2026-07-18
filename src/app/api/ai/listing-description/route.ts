import { NextResponse } from "next/server";
import { requireAuth, jsonError, fail } from "@/lib/server/guards";
import { generateListingDescription } from "@/lib/server/ai/generateListingDescription";
import { SECTOR_BY_VALUE } from "@/lib/sectors";

// POST /api/ai/listing-description   (authenticated — Add-Offering wizard only)
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    kind?: "product" | "service";
    categoryLabel?: string;
    sectorValue?: string;
    attributes?: { name: string; value: string }[];
  } | null;

  const name = body?.name?.trim();
  const kind = body?.kind === "service" ? "service" : "product";
  if (!name) return jsonError(400, "name is required.");

  const sector = body?.sectorValue
    ? SECTOR_BY_VALUE[body.sectorValue]
    : undefined;

  try {
    const description = await generateListingDescription({
      name,
      kind,
      categoryLabel: body?.categoryLabel,
      sectorLabel: sector?.label,
      attributes: Array.isArray(body?.attributes) ? body.attributes : [],
    });
    return NextResponse.json({ description });
  } catch (err) {
    return fail(err, "Couldn't generate a description right now.");
  }
}
