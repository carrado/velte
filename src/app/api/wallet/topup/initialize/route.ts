import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { initializeTopup } from "@/lib/server/wallet";
import type { AutoRechargeSetup } from "@/types/wallet";

const MIN_AMOUNT_NAIRA = 1000;
const MIN_AMOUNT_KOBO = MIN_AMOUNT_NAIRA * 100;

// POST /api/wallet/topup/initialize
export async function POST(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const body = await req.json().catch(() => null);
  const amountNaira = Number(body?.amountNaira);
  if (!Number.isFinite(amountNaira) || amountNaira < MIN_AMOUNT_NAIRA) {
    return jsonError(
      400,
      `Minimum top-up is ₦${MIN_AMOUNT_NAIRA.toLocaleString("en-NG")}.`,
    );
  }

  // Optional first-time auto-recharge setup riding along with the payment —
  // persisted by the backend only once the charge succeeds.
  let autoRecharge: AutoRechargeSetup | undefined;
  if (body?.autoRecharge) {
    const thresholdKobo = Number(body.autoRecharge.thresholdKobo);
    const topupKobo = Number(body.autoRecharge.topupKobo);
    if (
      !Number.isFinite(thresholdKobo) ||
      thresholdKobo < MIN_AMOUNT_KOBO ||
      !Number.isFinite(topupKobo) ||
      topupKobo < MIN_AMOUNT_KOBO
    ) {
      return jsonError(
        400,
        `Auto-recharge amounts must be at least ₦${MIN_AMOUNT_NAIRA.toLocaleString("en-NG")}.`,
      );
    }
    autoRecharge = { thresholdKobo, topupKobo };
  }

  try {
    const result = await initializeTopup(
      amountNaira,
      gate.cookie,
      autoRecharge,
    );
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to start top-up.");
  }
}
