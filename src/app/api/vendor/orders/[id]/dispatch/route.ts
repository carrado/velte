import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { dispatchVendorOrder } from "@/lib/server/cart";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const order = await dispatchVendorOrder(id, gate.cookie, {
      method: body?.method === "courier" ? "courier" : "self",
      carrier: typeof body?.carrier === "string" ? body.carrier : undefined,
      trackingCode:
        typeof body?.trackingCode === "string" ? body.trackingCode : undefined,
    });
    return NextResponse.json({ order });
  } catch (err) {
    return fail(err, "Couldn't dispatch that order.");
  }
}
