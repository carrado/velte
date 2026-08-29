import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";

// DELETE /api/price-watch/:id — stop watching something.
//
// Ownership is enforced upstream (the backend scopes the delete to the
// authenticated ACCOUNT, buyer or vendor), so an id leaking into a URL or a
// screenshot can't be replayed against someone else's watch.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Either session — vendors own watches too. The backend scopes the delete
  // to the owner, so this only decides whose cookie to forward.
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  const cookie = buyerAuth?.cookie ?? vendorAuth?.cookie;
  if (!cookie) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await backendData(`/price-watch/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Couldn't remove that watch.");
  }
}
