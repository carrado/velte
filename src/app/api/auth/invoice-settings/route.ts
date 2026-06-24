import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { InvoiceReceiptSettings } from "@/types/invoice";

// GET /api/auth/invoice-settings
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const settings = await backendData<InvoiceReceiptSettings>(
      "/auth/invoice-settings",
      { cookie: gate.cookie },
    );
    return NextResponse.json(settings);
  } catch (err) {
    return fail(err, "Failed to load invoice settings.");
  }
}

// PUT /api/auth/invoice-settings
export async function PUT(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const settings = await backendData<InvoiceReceiptSettings>(
      "/auth/invoice-settings",
      { method: "PUT", body, cookie: gate.cookie },
    );
    return NextResponse.json(settings);
  } catch (err) {
    return fail(err, "Failed to save invoice settings.");
  }
}
