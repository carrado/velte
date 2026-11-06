import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { CartOrder } from "@/types/cart";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    reason?: unknown;
    detail?: unknown;
  } | null;
  try {
    const data = await backendData<{ order: CartOrder }>(
      `/cart/orders/${id}/dispute`,
      { method: "POST", body, cookie: gate.cookie },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't open that dispute.");
  }
}
