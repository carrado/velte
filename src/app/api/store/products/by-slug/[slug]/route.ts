import { NextResponse } from "next/server";

import { getActorAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { getPublicProductBySlug } from "@/lib/server/store";

/** Public product detail — cookie optional so signed-in viewers get WhatsApp. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }
  try {
    const actor = await getActorAuth();
    const data = await getPublicProductBySlug(slug, actor?.cookie);
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load this product.");
  }
}
