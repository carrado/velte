import { backendData } from "@/lib/server/backend";
import {
  accountQuotaTable,
  DEFAULT_PLAN,
  guestPlan,
  planFor,
  VENDOR_PLAN,
  type MeteredKind,
  type Plan,
} from "@/lib/server/ai/plans";

// ---------------------------------------------------------------------
// Per-account search metering, frontend half (2026-08-29).
//
// Answers one question for /api/search: may this account run this search, and
// count it if so. The plan table (plans.ts) supplies the limits; velte-backend
// owns the counters and does the atomic check-and-increment.
//
// "Account" covers BOTH a signed-in buyer and a signed-in vendor. They use
// different cookies, and reading only the buyer one is what made a vendor
// look anonymous here — refused photo search and told to sign in while
// already signed in. A vendor is metered at VENDOR_PLAN's allowance.
//
// THE RULE THAT OVERRIDES EVERYTHING HERE: FAIL OPEN. If the backend is
// asleep on Render's free tier, slow, or broken, the buyer searches. A
// metering outage must never look like an outage of Velte itself — the
// worst case of failing open is a few unmetered searches, and the worst case
// of failing closed is a dead product for everyone at once. Every catch
// below therefore returns `allowed: true`, deliberately and not by accident.
//
// The one exception is a plan whose quota for this kind is zero: that is a
// FEATURE being off, decided locally from the plan table with no network
// call at all, so there is nothing to fail.
// ---------------------------------------------------------------------

interface UsageFacts {
  /** Count AFTER this search, when allowed; the spent total when not. */
  used: number;
  limit: number;
  plan: Plan;
  kind: MeteredKind;
  /** True when there is no account at all — the message should invite them
   *  to sign in, which is a different and much better prompt than "upgrade". */
  isGuest: boolean;
  /** Which kind of account, for wording. A vendor must never be offered a
   *  buyer subscription: they cannot meaningfully buy one, and telling a
   *  paying vendor to "upgrade to Velte Plus" is nonsense. */
  actorType: "guest" | "buyer" | "vendor";
}

/** A discriminated union rather than a boolean beside a free-floating
 *  reason: "allowed with a reason of 'exhausted'" is not a state that can
 *  exist, and expressing that in the type means the route's refusal branch
 *  narrows to exactly the two reasons it has wording for, instead of
 *  needing a cast to satisfy the stream event. */
export type UsageDecision =
  | (UsageFacts & { allowed: true; reason: "ok" })
  | (UsageFacts & {
      allowed: false;
      /** `unavailable` = this plan never had it; `exhausted` = used up. */
      reason: "unavailable" | "exhausted";
    });

/** Calendar month in UTC. UTC rather than Africa/Lagos on purpose: the
 *  backend compares this string and nothing else, so the only thing that
 *  matters is that every caller agrees. Lagos is UTC+1 with no DST, so a
 *  buyer's month rolls over at 1am local — close enough for a quota, and it
 *  avoids a timezone dependency on both sides of the wire. */
export function currentPeriodKey(now = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}`;
}

function allow(
  plan: Plan,
  kind: MeteredKind,
  actorType: "guest" | "buyer" | "vendor",
  used = 0,
): UsageDecision {
  return {
    allowed: true,
    used,
    limit: plan.quotas[kind],
    plan,
    kind,
    isGuest: actorType === "guest",
    actorType,
    reason: "ok",
  };
}

/**
 * Checks and consumes one unit of a signed-in account's quota.
 *
 * `actorType` only decides whether there IS an account and how to word a
 * refusal — the backend resolves identity and tier from the forwarded cookie
 * itself, so this can never meter the wrong account even if the caller were
 * confused about who it is.
 */
export async function consumeSearchQuota(params: {
  actorType: "guest" | "buyer" | "vendor";
  /** The session cookie header to forward, as getOptionalBuyerAuth (buyer)
   *  or the vendor equivalent returns it. Passed in rather than re-read here
   *  so this stays a plain function the caller can hand a session to, and so
   *  it doesn't depend on being inside a Next request scope. */
  cookie: string | null;
  kind: MeteredKind;
}): Promise<UsageDecision> {
  const { actorType, cookie, kind } = params;

  // ── Anonymous ────────────────────────────────────────────────────────
  // No account means no row to count against. A deviceId could be metered
  // here, but it resets with browser storage, so enforcing it server-side
  // would cost a round trip to stop nobody. The guest allowance is small
  // precisely because it is honour-system; what actually protects spend is
  // that photo search — the expensive kind — is off entirely for guests.
  if (actorType === "guest") {
    const plan = guestPlan();
    if (plan.quotas[kind] <= 0) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        plan,
        kind,
        isGuest: true,
        actorType,
        reason: "unavailable",
      };
    }
    return allow(plan, kind, "guest");
  }

  // Which tier applies is only known to the backend (a buyer's plan is on
  // their row; a vendor maps to VENDOR_PLAN), so unlike the guest path there
  // is nothing to decide locally — the quota table goes over and the answer
  // comes back with the plan attached. This is only the optimistic assumption
  // used for a fail-open message.
  const assumedPlan = planFor(
    actorType === "vendor" ? VENDOR_PLAN : DEFAULT_PLAN,
  );

  // A buyerId with no cookie shouldn't happen (the id came FROM the cookie),
  // but if it does there is nothing to authenticate with — let it through
  // rather than blocking on an impossible state.
  if (!cookie) return allow(assumedPlan, kind, actorType);

  try {
    const data = await backendData<{
      allowed: boolean;
      used: number;
      limit: number;
      plan: string;
    }>("/usage/consume", {
      method: "POST",
      body: {
        kind,
        limits: accountQuotaTable(kind),
        periodKey: currentPeriodKey(),
      },
      cookie,
    });

    // The backend answers "vendor" for a vendor, which is not a PlanId —
    // planFor resolves it to the Free row, which is what VENDOR_PLAN points
    // at and what the quota table sent for it.
    const plan = planFor(data.plan === "vendor" ? VENDOR_PLAN : data.plan);
    const facts = {
      used: data.used,
      limit: data.limit,
      plan,
      kind,
      isGuest: false as const,
      actorType,
    };
    if (data.allowed) return { ...facts, allowed: true, reason: "ok" };
    return {
      ...facts,
      allowed: false,
      // A refusal at a zero limit is the FEATURE being off for this tier,
      // not an allowance running out — different situation, different
      // message (see quotaMessage).
      reason: data.limit === 0 ? "unavailable" : "exhausted",
    };
  } catch (err) {
    // Fail open — see this file's header. Logged at warn so a metering
    // outage is visible in the logs without being visible to buyers.
    console.warn(
      "[usage] metering unavailable, allowing search:",
      err instanceof Error ? err.message : err,
    );
    return allow(assumedPlan, kind, actorType);
  }
}

/**
 * The message shown when a search is refused. Kept here rather than in the
 * route so the wording stays next to the plan data it describes.
 *
 * Four different messages, because they are four different situations and one
 * generic "limit reached" would waste the best conversion moment in the
 * product. A guest hitting photo search wants to sign in, not a quota
 * lecture — and a VENDOR must never be offered a buyer subscription, which is
 * both meaningless to them and insulting to an account that already pays for
 * leads.
 */
export function quotaMessage(decision: UsageDecision): string {
  const { plan, kind, used, limit, isGuest, actorType, reason } = decision;
  const noun = kind === "photo" ? "photo search" : "search";

  if (actorType === "vendor") {
    // No upsell and no sign-in prompt: they are signed in, and Velte Plus is
    // a buyer product. Just the facts and when it resets.
    return reason === "unavailable"
      ? `${noun[0].toUpperCase()}${noun.slice(1)} isn't available on a vendor account.`
      : `You've used all ${limit} ${noun}es on your vendor account this month (${used}/${limit}). They reset on the 1st.`;
  }

  if (isGuest && reason === "unavailable") {
    // No number here on purpose. Naming the free photo allowance ("you get 2
    // a month") reads as a limit at the exact moment we're asking someone to
    // sign up — it discourages rather than invites. They find out what the
    // allowance is by using it, which is the right order.
    return "Searching with a photo needs a free Velte account — sign in and you can search by photo, and keep your search history.";
  }
  if (isGuest) {
    return `You've used your ${limit} free ${noun}es. Sign in to keep going — a free account gets you ${
      planFor("free").quotas.text
    } a month.`;
  }
  if (reason === "unavailable") {
    return `${noun[0].toUpperCase()}${noun.slice(1)} isn't included on ${plan.name}. Upgrade to ${
      planFor("plus").name
    } to use it.`;
  }
  return `You've used all ${limit} ${noun}es on ${plan.name} this month (${used}/${limit}). They reset on the 1st, or upgrade to ${
    planFor("plus").name
  } for ${planFor("plus").quotas[kind]}.`;
}
