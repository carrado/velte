import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const vendorAuth = await getOptionalVendorAuth();
  if (!vendorAuth) {
    return NextResponse.json(
      { error: "Sign in as an Enterprise vendor." },
      { status: 401 },
    );
  }
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    body?: unknown;
  } | null;

  try {
    const data = await backendData(
      `/hub/community/posts/${encodeURIComponent(id)}/replies`,
      {
        method: "POST",
        body: { body: body?.body },
        cookie: vendorAuth.cookie,
      },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't post reply.");
  }
}
