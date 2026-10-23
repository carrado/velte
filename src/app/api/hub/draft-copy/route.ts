import { NextResponse } from "next/server";

import { fail, getOptionalVendorAuth } from "@/lib/server/guards";
import { generateAdvertCopy } from "@/lib/server/ai/generateAdvertCopy";

// Vendor advert AI drafting — returns options, posts nothing. The vendor
// picks an option into the composer and edits freely.
export async function POST(req: Request) {
  const vendorAuth = await getOptionalVendorAuth();
  if (!vendorAuth) {
    return NextResponse.json(
      { error: "Sign in as a vendor." },
      { status: 401 },
    );
  }
  const body = (await req.json().catch(() => null)) as {
    storeName?: unknown;
    productName?: unknown;
    seedHeadline?: unknown;
  } | null;

  const storeName =
    typeof body?.storeName === "string" && body.storeName.trim()
      ? body.storeName.trim().slice(0, 80)
      : null;
  if (!storeName) {
    // Grounded in the vendor's own store — never drafted from nothing. The
    // composer fills this from the store profile it already loaded.
    return NextResponse.json(
      { error: "Store name is required." },
      { status: 400 },
    );
  }

  try {
    const copy = await generateAdvertCopy({
      storeName,
      productName:
        typeof body?.productName === "string"
          ? body.productName.slice(0, 120)
          : null,
      seedHeadline:
        typeof body?.seedHeadline === "string"
          ? body.seedHeadline.slice(0, 80)
          : null,
    });
    return NextResponse.json(copy);
  } catch (err) {
    return fail(err, "Couldn't draft copy.");
  }
}
