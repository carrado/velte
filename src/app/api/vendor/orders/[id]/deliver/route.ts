import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { deliverVendorOrder } from "@/lib/server/cart";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const { id } = await params;
    const order = await deliverVendorOrder(id, gate.cookie);
    return NextResponse.json({ order });
  } catch (err) {
    return fail(err, "Couldn't mark that order delivered.");
  }
}
