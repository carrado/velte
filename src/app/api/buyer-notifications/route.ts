import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { BuyerNotification } from "@/types/buyerNotification";

// GET /api/buyer-notifications
export async function GET() {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  try {
    const { notifications, unreadCount } = await backendData<{
      notifications: BuyerNotification[];
      unreadCount: number;
      page: number;
    }>("/buyer-notifications", { cookie: gate.cookie });
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return fail(err, "Failed to load your notifications.");
  }
}
