import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { getActorAuth } from "@/lib/server/buyerGuards";
import { generateAdvertCopy } from "@/lib/server/ai/generateAdvertCopy";

// Advert AI drafting for vendors and buyers — returns options, posts nothing.
// The user picks an option into the composer and edits freely.
export async function POST(req: Request) {
  const actor = await getActorAuth();
  if (!actor) {
    return NextResponse.json(
      { error: "Authentication required to draft advert copy." },
      { status: 401 },
    );
  }
  const body = (await req.json().catch(() => null)) as {
    storeName?: unknown;
    productName?: unknown;
    seedHeadline?: unknown;
    brief?: unknown;
  } | null;

  const storeName =
    typeof body?.storeName === "string" && body.storeName.trim()
      ? body.storeName.trim().slice(0, 80)
      : null;
  if (!storeName) {
    return NextResponse.json(
      { error: "Store name is required." },
      { status: 400 },
    );
  }

  try {
    const copy = await generateAdvertCopy({
      storeName,
      productName:
        typeof body?.productName === "string"
          ? body.productName.slice(0, 120)
          : null,
      seedHeadline:
        typeof body?.seedHeadline === "string"
          ? body.seedHeadline.slice(0, 80)
          : null,
      brief: typeof body?.brief === "string" ? body.brief.slice(0, 300) : null,
    });
    return NextResponse.json(copy);
  } catch (err) {
    return fail(err, "Couldn't draft copy.");
  }
}
