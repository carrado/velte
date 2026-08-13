import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { MarketplaceBrowseItem, VendorPreviewItem } from "@/types/store";

// GET /api/buyer-saved/my
export async function GET() {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  try {
    const { products, vendors } = await backendData<{
      products: MarketplaceBrowseItem[];
      vendors: VendorPreviewItem[];
    }>("/buyer-saved/my", { cookie: gate.cookie });
    return NextResponse.json({ products, vendors });
  } catch (err) {
    return fail(err, "Failed to load your saved items.");
  }
}
