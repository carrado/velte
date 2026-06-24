import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { listCategories } from "@/lib/server/products";

// GET /api/categories
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const categories = await listCategories(gate.cookie);
    return NextResponse.json({ categories });
  } catch (err) {
    return fail(err, "Failed to load categories.");
  }
}
