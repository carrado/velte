import { GUEST_CREDITS } from "@/lib/credits";

// The signed-out browser's credit balance (2026-08-31, moved off
// localStorage onto a cookie 2026-09-05).
//
// Replaces guestUsage.ts's per-kind counters with the one thing the credit
// model needs: a balance. Same storage discipline as before — every access
// wrapped, because private windows and browsers set to block site data THROW
// rather than returning null, and a storage error must never cost someone
// the product.
//
// WHY A COOKIE NOW, NOT LOCALSTORAGE. Functionally the two are the same
// promise: both live in the browser, both vanish if the guest deliberately
// clears their data, and neither is a security boundary — this remains an
// honour system on purpose (see below). The difference is what happens
// WITHOUT the guest doing anything at all: Safari's Intelligent Tracking
// Prevention automatically expires localStorage (and IndexedDB) after a
// week of the site going unvisited, but does not apply that same cap to an
// ordinary first-party cookie set by the site itself. A guest who used
// Velte, went quiet for a week, and came back was silently handed a full
// balance again on Safari — not because they did anything, but because the
// browser's own privacy feature reset our counter for us. A cookie does not
// have that failure mode.
//
// It is still NOT durable against a deliberate full "clear my browsing
// data," and that is not something anything client-held can fix — a
// cookie is cleared in the exact same click as localStorage in every
// browser's own version of that action. The backstop for THAT case is
// server-side and network-scoped, not identity-scoped: see
// lib/server/guestNetworkGate.ts, which does not try to recognise this
// browser at all, only to notice when an unusual amount of guest activity
// has come from the same shared connection.
//
// NO PERIOD KEY, and its absence is the point. Guest credits are one-off, like
// every other grant in this system: spend them and the next step is an
// account, not the 1st of the month. The old counter's monthly reset is gone
// deliberately — if it reappears, the plan model is creeping back.
//
// Honour-system, and that is fine. It lives in the browser and resets if the
// browser's data is cleared; the number's job is to convert someone who has
// just watched Velte work, not to defend against someone determined to avoid
// signing up. Anyone willing to clear their data every five searches was
// never going to pay — and now that clearing storage no longer resets things
// unprompted (the Safari case above), doing it on purpose is the only way
// left to reach this ceiling at all.

const KEY = "velte_guest_credits";

/** A year. Long enough to behave like "until they clear it," which is the
 *  same durability localStorage always had — there is no reason for this
 *  cookie to expire on its own before that. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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
   *  whole reason it exists: the double-charge this is meant to prevent
   *  happens when a thread is rehydrated after a REFRESH and a content-priced
   *  block in it mounts again. A ref dies with the page; only something
   *  persisted can recognise a spend it has already made. */
  spent?: string[];
}

/** Reads one cookie by name. `document.cookie` has no per-name accessor of
 *  its own — it hands back every cookie as one semicolon-joined string, so
 *  this is the small parse every cookie-reading site ends up writing once. */
function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

/** Writes one cookie. `path=/` so it is visible from every route this
 *  balance is read on, not just whichever page happens to write it;
 *  `SameSite=Lax` and `Secure` (skipped on plain-http localhost, so dev
 *  keeps working) because this is ordinary first-party state, never sent
 *  anywhere cross-site and never read by the server — the same trust level
 *  localStorage always had, just relocated. */
function writeCookie(name: string, value: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function read(): Ledger {
  const fresh: Ledger = { balance: GUEST_CREDITS };
  try {
    const raw = readCookie(KEY);
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

function write(ledger: Ledger): void {
  writeCookie(KEY, JSON.stringify(ledger));
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

  // Already paid for this exact thing — allow it again, free. What lets a
  // rehydrated thread re-render a content-priced block a guest already
  // bought without charging twice.
  const spent = current.spent ?? [];
  if (token && spent.includes(token)) return true;

  if (current.balance < cost) return false;
  try {
    write({
      balance: current.balance - cost,
      spent: token ? [...spent, token].slice(-MAX_TOKENS) : spent,
    });
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
    write({ balance: Math.min(current.balance + cost, GUEST_CREDITS) });
  } catch {
    // Best-effort, exactly like the server-side refund.
  }
}
