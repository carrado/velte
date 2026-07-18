import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { listProducts, createProduct } from "@/lib/server/products";
import type { CreateProductPayload } from "@/types/product";

// GET /api/products?page=&limit=&category_id=&tab=&search=&sort_by=&sort_order=
export async function GET(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const result = await listProducts(req.nextUrl.searchParams, gate.cookie);
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to load listings.");
  }
}

// POST /api/products
export async function POST(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const payload = (await req
    .json()
    .catch(() => null)) as CreateProductPayload | null;
  if (!payload) return jsonError(400, "A product payload is required.");

  try {
    const product = await createProduct(payload, gate.cookie);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return fail(err, "Failed to create listing.");
  }
}
