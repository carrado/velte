import { GUEST_CREDITS } from "@/lib/credits";

// The signed-out browser's credit balance (2026-08-31).
//
// Replaces guestUsage.ts's per-kind counters with the one thing the credit
// model needs: a balance. Same storage discipline as before — every access
// wrapped, because private windows and browsers set to block site data THROW
// on localStorage rather than returning null, and a storage error must never
// cost someone the product.
//
// NO PERIOD KEY, and its absence is the point. Guest credits are one-off, like
// every other grant in this system: spend them and the next step is an
// account, not the 1st of the month. The old counter's monthly reset is gone
// deliberately — if it reappears, the plan model is creeping back.
//
// Honour-system, and that is fine. It lives in browser storage and resets if
// the browser is cleared; the number's job is to convert someone who has just
// watched Velte work, not to defend against someone determined to avoid
// signing up. Anyone willing to clear their storage every five searches was
// never going to pay.

const KEY = "velte:guest-credits";

/** Bounded so a long session can't grow storage without end. Only appended to
 *  when a spend actually happened, so it cannot exceed the number of spends
 *  the starting balance allows — belt and braces against a hand-edited
 *  value. */
const MAX_TOKENS = 40;

interface Ledger {
  /** Credits left. Starts at GUEST_CREDITS and only ever goes down. */
  balance: number;
  /** Spends already made, by token — see `spendGuestCredits`.
   *
   *  Kept in STORAGE rather than in a React ref, and that distinction is the
   *  whole reason it exists: the double-charge this prevents happens when a
   *  thread is rehydrated after a REFRESH and every band in it mounts again.
   *  A ref dies with the page; only something persisted can recognise a spend
   *  it has already made. */
  spent?: string[];
}

function read(): Ledger {
  const fresh: Ledger = { balance: GUEST_CREDITS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as Partial<Ledger> | null;
    if (
      !parsed ||
      typeof parsed.balance !== "number" ||
      !Number.isFinite(parsed.balance) ||
      parsed.balance < 0
    ) {
      // Corrupt or hand-edited. Failing to a FULL balance rather than an
      // empty one is the right direction for an honour-system allowance: it
      // can't lock out someone whose browser mangled the value.
      return fresh;
    }
    return {
      balance: Math.min(Math.trunc(parsed.balance), GUEST_CREDITS),
      spent: Array.isArray(parsed.spent)
        ? parsed.spent.filter((t) => typeof t === "string")
        : [],
    };
  } catch {
    return fresh;
  }
}

/** What this browser has left. Zero on the server, where there is no storage
 *  and no gate to run — a search can only be started from a browser. */
export function guestCredits(): number {
  if (typeof window === "undefined") return GUEST_CREDITS;
  return read().balance;
}

/** Can this browser afford an action costing `cost`? */
export function guestCanAfford(cost: number): boolean {
  if (typeof window === "undefined") return true;
  return read().balance >= cost;
}

/**
 * Spends `cost` credits if the balance covers it. Returns whether it did.
 *
 * One call that decides AND debits, like claimGuestUse before it: splitting
 * the check from the write is what let a component charge itself twice on a
 * re-render, and there is no reason to reintroduce that seam.
 *
 * Failing storage returns `true` and debits nothing — an unwritable ledger
 * must never refuse the product.
 */
export function spendGuestCredits(cost: number, token?: string): boolean {
  if (typeof window === "undefined") return true;
  let current: Ledger;
  try {
    current = read();
  } catch {
    return true;
  }

  // Already paid for this exact thing — allow it again, free. What makes a
  // rehydrated thread render the bands a guest already bought.
  const spent = current.spent ?? [];
  if (token && spent.includes(token)) return true;

  if (current.balance < cost) return false;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        balance: current.balance - cost,
        spent: token ? [...spent, token].slice(-MAX_TOKENS) : spent,
      }),
    );
  } catch {
    // See above — an unwritable balance is an uncounted spend, not a refusal.
  }
  return true;
}

/** Gives a spend back — the guest half of the Google Places refund (a turn
 *  that never reached Serper isn't billable). Capped at the starting
 *  allowance so a refund can never mint credits. */
export function refundGuestCredits(cost: number): void {
  if (typeof window === "undefined") return;
  try {
    const current = read();
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        balance: Math.min(current.balance + cost, GUEST_CREDITS),
      }),
    );
  } catch {
    // Best-effort, exactly like the server-side refund.
  }
}
