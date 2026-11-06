import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const buyer = await getOptionalBuyerAuth();
  if (!buyer)
    return NextResponse.json({ error: "Sign in as a buyer." }, { status: 401 });
  const { id } = await params;
  try {
    const data = await backendData(
      `/trust/community/${id}/report?audience=buyer`,
      { method: "POST", cookie: buyer.cookie },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't report that post.");
  }
}
