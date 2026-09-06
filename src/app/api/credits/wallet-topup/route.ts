import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

// POST /api/credits/wallet-topup — buy a credit pack with Velte wallet money.
//
// VENDORS ONLY. A vendor already keeps a float with Velte for lead charges,
// and making them re-enter a card to buy search is the kind of friction that
// stops a vendor using their own product. Buyers have no wallet, so for them
// this route does not exist — velte-backend answers 403 and the panel never
// shows the option in the first place.
//
// Unlike /api/credits/checkout there is no Paystack round trip and no webhook
// to wait for: the money is already ours, so the backend debits the wallet and
// applies the credits in the same request and answers with both new balances.
//
// The VENDOR cookie is preferred here, which is the opposite of every other
// credits route. Everywhere else the buyer cookie wins because someone on
// /chat is acting as a buyer — but a wallet belongs to a vendor identity, and
// spending from it as anyone else is meaningless. A vendor who also has a
// buyer session gets their wallet, and the credits land on the account the
// backend resolves from the cookie it was actually given.
export async function POST(req: Request) {
  const vendorAuth = await getOptionalVendorAuth();
  if (!vendorAuth) {
    // A signed-in BUYER is told what is actually true rather than "sign in",
    // which would be baffling to someone already signed in.
    const buyerAuth = await getOptionalBuyerAuth();
    return NextResponse.json(
      {
        error: buyerAuth
          ? "Only vendor accounts have a Velte wallet. Top up with a card instead."
          : "Sign in to top up credits.",
      },
      { status: buyerAuth ? 403 : 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    packId?: string;
  } | null;
  if (!body?.packId) {
    return NextResponse.json({ error: "Pick a credit pack." }, { status: 400 });
  }

  try {
    const data = await backendData<{
      balance: number;
      credits: number;
      amountKobo: number;
      walletBalanceKobo: number;
      reference: string;
    }>("/credits/wallet-topup", {
      method: "POST",
      body: { packId: body.packId },
      cookie: vendorAuth.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    // `fail` passes the backend's own message through for an AppError, which
    // matters here: "your wallet doesn't have the ₦3,000 for this pack" is the
    // one thing the vendor needs to read, and a generic fallback would hide it.
    return fail(err, "Couldn't pay from your wallet.");
  }
}
