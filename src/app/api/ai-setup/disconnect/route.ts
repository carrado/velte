import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// DELETE /api/ai-setup/disconnect
export async function DELETE() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    await backendFetch("/ai-setup/disconnect", {
      method: "DELETE",
      cookie: gate.cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to disconnect AI.");
  }
}
