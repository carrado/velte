import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";

// GET /api/auth/me
//
// The STRICT vendor-required half of "the single auth API" (2026-09-16) —
// requireAuth() below still 401s locally when there's no vendor cookie,
// exactly as before. What changed is the backend: velte-backend's own
// GET /auth/me is no longer vendor-only (see that repo's userProfile.js) —
// it reads both cookies and ALWAYS 200s with `{ vendor, buyer, vendorError }`,
// so a lenient caller (src/app/api/auth/session/route.ts) can use the SAME
// endpoint without a broken vendor cookie also swallowing valid buyer data.
// `vendorError` is what used to be the backend's own non-2xx — translated
// back into a real error status HERE, since this route's own callers (the
// dashboard's AppInitOverlay, specifically) still depend on a 403 with an
// `email` field to route an unverified vendor to email verification.
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const { vendor, vendorError } = await backendData<{
      vendor: Record<string, unknown> | null;
      vendorError: { status: number; message: string; email?: string } | null;
    }>("/auth/me", { cookie: gate.cookie });
    if (vendorError) {
      return jsonError(
        vendorError.status,
        vendorError.message,
        vendorError.email ? { email: vendorError.email } : undefined,
      );
    }
    // The backend returns the raw Mongoose doc (`_id`), whereas login
    // returns `id`. The frontend `User` type — and features like push subscribe —
    // depend on `id`, so normalise it here or a getMe() refresh wipes `user.id`.
    return NextResponse.json({
      user: vendor ? { ...vendor, id: vendor.id ?? vendor._id } : null,
    });
  } catch (err) {
    return fail(err, "Failed to load profile.");
  }
}
