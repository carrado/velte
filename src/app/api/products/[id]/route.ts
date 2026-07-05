import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import {
  getProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/server/products";
import type { CreateProductPayload } from "@/types/product";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/products/:id
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    const product = await getProduct(id, gate.cookie);
    return NextResponse.json({ product });
  } catch (err) {
    return fail(err, "Failed to load listing.");
  }
}

// PUT /api/products/:id
export async function PUT(req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;

  const payload = (await req
    .json()
    .catch(() => null)) as Partial<CreateProductPayload> | null;
  if (!payload) return jsonError(400, "A product payload is required.");

  try {
    const product = await updateProduct(id, payload, gate.cookie);
    return NextResponse.json({ product });
  } catch (err) {
    return fail(err, "Failed to update listing.");
  }
}

// DELETE /api/products/:id
export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    await deleteProduct(id, gate.cookie);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to delete listing.");
  }
}
