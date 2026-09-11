import type { ComposerTool } from "@/types/search";

// The search a buyer was refused for want of credits, held across a top-up
// (2026-09-05).
//
// Buying credits mid-conversation LEAVES the page: the card path redirects to
// Paystack and comes back to a fresh `/chat?topup=done`, so the refused turn —
// which was never persisted server-side, because /api/search refuses before it
// does any work — is gone by the time the credits land. Without somewhere to
// put it, someone who has just paid is returned to a thread with no sign of
// what they asked for and has to type it again, which is the worst possible
// moment to ask anyone to repeat themselves.
//
// localStorage rather than component state, for the simplest possible
// reason: state does not survive a redirect. Cleared on READ, so a resume
// that somehow fails cannot sit there re-firing on every later page load.
//
// The WALLET top-up and the guest sign-in paths never navigate away and are
// resumed from the live turn in memory; this record is the redirect path's
// copy of the same facts, and is written on every refusal because at refusal
// time there is no telling which way the buyer will pay.

const KEY = "velte-pending-refused-search";

/** How long a held search stays resumable. Long enough for a card payment
 *  (Paystack, an OTP, a bank app) and nothing like long enough for the buyer
 *  to have moved on — a search resumed an hour later would arrive as a
 *  non-sequitur in whatever conversation they are having by then. */
const MAX_AGE_MS = 30 * 60 * 1000;

export interface PendingRefusedSearch {
  message: string;
  /** The uploaded (Cloudinary) URL, never the local blob preview — the blob
   *  dies with the tab, and the remote URL renders in the same slot. */
  imageUrl: string | null;
  isContinuation: boolean;
  activeTool: ComposerTool | null;
  /** The two numbers the refusal itself carried: what they had, and what the
   *  turn costs. Together they say when the top-up has actually landed —
   *  credits are granted by a Paystack WEBHOOK, so the buyer routinely gets
   *  back here a moment before the grant does. */
  balance: number;
  cost: number;
  at: number;
}

export function holdRefusedSearch(pending: PendingRefusedSearch): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* private mode — the buyer retypes, which is recoverable */
  }
}

/** Reads and clears the held search. Null when there is none, when it is
 *  older than MAX_AGE_MS, or when storage is unavailable. */
export function takeRefusedSearch(): PendingRefusedSearch | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingRefusedSearch> | null;
    if (!parsed || typeof parsed.message !== "string") return null;
    if (!parsed.message && !parsed.imageUrl) return null;
    if (typeof parsed.at !== "number" || Date.now() - parsed.at > MAX_AGE_MS) {
      return null;
    }
    return {
      message: parsed.message,
      imageUrl: parsed.imageUrl ?? null,
      isContinuation: Boolean(parsed.isContinuation),
      activeTool: parsed.activeTool ?? null,
      balance: typeof parsed.balance === "number" ? parsed.balance : 0,
      cost: typeof parsed.cost === "number" ? parsed.cost : 0,
      at: parsed.at,
    };
  } catch {
    return null;
  }
}

/** Drops the held search without reading it — for a refusal that has already
 *  been resumed in the live page, so returning from an unrelated later top-up
 *  doesn't replay a search the buyer already got an answer to. */
export function clearRefusedSearch(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing held, nothing to clear */
  }
}
