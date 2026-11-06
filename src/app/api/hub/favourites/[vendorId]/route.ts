import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const buyer = await getOptionalBuyerAuth();
  if (!buyer)
    return NextResponse.json({ error: "Sign in as a buyer." }, { status: 401 });
  const { vendorId } = await params;
  try {
    const data = await backendData(
      `/hub/favourites/${vendorId}?audience=buyer`,
      { method: "DELETE", cookie: buyer.cookie },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't remove that vendor.");
  }
}
