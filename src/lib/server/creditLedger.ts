import { backendData } from "@/lib/server/backend";
import {
  ACTION_LABEL,
  CREDIT_COST,
  GUEST_CREDITS,
  guestExhaustedMessage,
  type CreditAction,
} from "@/lib/credits";
import { MIN_TOPUP_NGN } from "@/lib/creditPacks";
import { formatNaira } from "@/lib/utils";

// ---------------------------------------------------------------------
// Credit spending, frontend half (2026-08-31).
//
// Answers one question for /api/search and friends: can this account afford
// this action, and take the credits if so. The price table (credits.ts)
// supplies the cost; velte-backend owns the balance and does the atomic
// check-and-debit.
//
// THE RULE THAT OVERRIDES EVERYTHING HERE: FAIL OPEN — inherited unchanged
// from the metering it replaces. If the backend is asleep on Render's free
// tier, slow, or broken, the buyer searches. A ledger outage must never look
// like an outage of Velte itself: the worst case of failing open is a few
// unbilled searches, and the worst case of failing closed is a dead product
// for everyone at once.
// ---------------------------------------------------------------------

export interface CreditDecision {
  allowed: boolean;
  /** Balance AFTER the charge when allowed; what they have when refused. */
  balance: number;
  cost: number;
  action: CreditAction;
  /** True when there is no account at all — the refusal should invite them to
   *  sign in, which is a far better prompt than "buy credits". */
  isGuest: boolean;
}

/**
 * Can this account afford an action — WITHOUT taking anything.
 *
 * The counterpart to charging on success. Nothing is billed until the work is
 * delivered (2026-08-31), but that alone would let an account with an empty
 * balance still trigger the expensive part — a real model call, a real Serper
 * call — and simply not pay for it. So the order is: check, do the work,
 * charge.
 *
 * The gap between the check and the charge is real and deliberately tolerated.
 * Two turns racing can both pass the check and only one can pay, because the
 * debit is filtered on `balance >= cost`; the loser gets served unbilled. That
 * is the right way round — the alternative is holding money for work that may
 * never be delivered.
 */
export async function affordCredits(params: {
  actorType: "guest" | "buyer" | "vendor";
  cookie: string | null;
  action: CreditAction;
}): Promise<CreditDecision> {
  const { actorType, cookie, action } = params;
  const cost = CREDIT_COST[action];

  if (actorType === "guest") {
    // Guests are answered in the browser, where their balance actually lives.
    return {
      allowed: true,
      balance: GUEST_CREDITS,
      cost,
      action,
      isGuest: true,
    };
  }
  if (!cookie) {
    return { allowed: true, balance: 0, cost, action, isGuest: false };
  }

  try {
    const data = await backendData<{ balance: number }>("/credits", { cookie });
    return {
      allowed: data.balance >= cost,
      balance: data.balance,
      cost,
      action,
      isGuest: false,
    };
  } catch (err) {
    // Fail open, like everything else here — a ledger outage must not look
    // like an outage of Velte.
    console.warn(
      "[credits] balance unavailable, allowing action:",
      err instanceof Error ? err.message : err,
    );
    return { allowed: true, balance: 0, cost, action, isGuest: false };
  }
}

/**
 * Charges an account for one action, AFTER it has succeeded.
 *
 * `actorType` only decides whether there IS an account — the backend resolves
 * identity from the forwarded cookie itself, so this can never charge the
 * wrong account even if the caller were confused about who it is.
 *
 * Guests never reach the backend: they have no row, their balance is
 * honour-system in browser storage, and a round trip to discover that would
 * cost latency to learn nothing. The client gate answers them.
 */
export async function chargeCredits(params: {
  actorType: "guest" | "buyer" | "vendor";
  cookie: string | null;
  action: CreditAction;
}): Promise<CreditDecision> {
  const { actorType, cookie, action } = params;
  const cost = CREDIT_COST[action];

  if (actorType === "guest") {
    // Decided in the browser (lib/guestCredits.ts) before the request is ever
    // made. Reaching here as a guest means the client gate already allowed it.
    return {
      allowed: true,
      balance: GUEST_CREDITS,
      cost,
      action,
      isGuest: true,
    };
  }

  if (!cookie) {
    // An account with no cookie shouldn't happen — the id came FROM the
    // cookie — but there is nothing to authenticate with, so let it through
    // rather than blocking on an impossible state.
    return { allowed: true, balance: 0, cost, action, isGuest: false };
  }

  try {
    const data = await backendData<{ allowed: boolean; balance: number }>(
      "/credits/consume",
      { method: "POST", body: { cost, action }, cookie },
    );
    return {
      allowed: data.allowed,
      balance: data.balance,
      cost,
      action,
      isGuest: false,
    };
  } catch (err) {
    console.warn(
      "[credits] ledger unavailable, allowing action:",
      err instanceof Error ? err.message : err,
    );
    return { allowed: true, balance: 0, cost, action, isGuest: false };
  }
}

/**
 * Gives a charge back.
 *
 * Kept, but no longer part of the search path: nothing is charged up front any
 * more, so there is nothing to give back when a turn turns out not to be
 * billable. It stays for the case a charge lands and the thing it paid for is
 * then undone — and because a ledger with no way to reverse an entry is a
 * ledger you cannot fix a mistake in.
 *
 * Best-effort by design. A refund that could throw would be worse than the
 * credit it failed to return.
 */
export async function refundCredits(params: {
  actorType: "guest" | "buyer" | "vendor";
  cookie: string | null;
  action: CreditAction;
}): Promise<void> {
  const { actorType, cookie, action } = params;
  if (actorType === "guest" || !cookie) return;
  try {
    await backendData("/credits/refund", {
      method: "POST",
      body: { cost: CREDIT_COST[action] },
      cookie,
    });
  } catch (err) {
    console.warn(
      "[credits] refund failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * What a buyer sees when they can't afford something.
 *
 * Three different endings because they are three different people, and the
 * difference is the whole conversion moment: a GUEST should be offered an
 * account (free, and twice what they had), someone signed in with an empty
 * balance should be offered a top-up, and someone who simply can't afford
 * THIS action but has credits should be told the shortfall rather than
 * "you're out" — because they aren't.
 */
export function creditMessage(decision: CreditDecision): string {
  const { balance, cost, action, isGuest } = decision;
  const label = ACTION_LABEL[action];

  if (isGuest) {
    // Shared with the client-side guest gate — see guestExhaustedMessage.
    return guestExhaustedMessage();
  }
  const minTopUp = formatNaira(MIN_TOPUP_NGN * 100);
  if (balance <= 0) {
    return `You're out of credits. Top up from ${minTopUp} to keep going — a ${label} costs ${cost}.`;
  }
  return `A ${label} costs ${cost} credits and you have ${balance}. Top up from ${minTopUp} to continue.`;
}
