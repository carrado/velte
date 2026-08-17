import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { MarketplaceBrowseItem } from "@/types/store";

// GET /api/buyer-saved/my
// Only ever asks the backend for `products` now — vendor-follow was removed
// from the buyer side 2026-08-17 (matching the vendor-side Followers
// teardown); the backend's own /buyer-saved/my still returns a `vendors`
// field, just unread here.
export async function GET() {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  try {
    const { products } = await backendData<{
      products: MarketplaceBrowseItem[];
    }>("/buyer-saved/my", { cookie: gate.cookie });
    return NextResponse.json({ products });
  } catch (err) {
    return fail(err, "Failed to load your saved items.");
  }
}
