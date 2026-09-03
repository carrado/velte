import {
  guestCanAfford,
  guestCredits,
  spendGuestCredits,
} from "@/lib/guestCredits";
import { isBillableTurn } from "@/lib/turnBillable";
import { CREDIT_COST, GUEST_CREDITS } from "@/lib/credits";
import type { SearchRequestBody, SearchStreamEvent } from "@/types/search";

type FinalEvent = Extract<SearchStreamEvent, { type: "final" }>;
type QuotaEvent = Extract<SearchStreamEvent, { type: "quota" }>;

interface SearchStreamHandlers {
  onStatus: (text: string) => void;
  // A standalone bubble arriving mid-turn, before `onFinal` — see
  // SearchStreamEvent's own "reply" comment.
  onReply: (text: string) => void;
  onFinal: (event: FinalEvent) => void;
  onError: (message: string) => void;
  // The turn was refused on quota / plan (2026-08-29) — terminal, arrives
  // alone, and is NOT a failure: see SearchStreamEvent's own "quota"
  // comment. Optional, but a caller that omits it still shows the buyer
  // something: dispatch falls back to onError rather than dropping the
  // event, because a silently ignored refusal looks to the buyer like the
  // Send button is broken.
  onQuota?: (event: QuotaEvent) => void;
  // Called instead of onError when `signal` fired (the buyer hit Stop) —
  // a deliberate cancel, not a real failure, so SearchHome.tsx can give it
  // its own quiet "Stopped generating." wrap-up rather than the scarier
  // "couldn't reach search" wording onError uses. Optional so any other
  // caller (there are none today, but this stays a plain library function,
  // not SearchHome-specific) isn't forced to handle a case it never
  // triggers by never passing a signal.
  onAbort?: () => void;
  /** Whether NOBODY is signed in — neither a buyer nor a vendor.
   *
   *  Required, not optional with a safe default, and that is the whole point:
   *  a default of `false` would silently leave a future call site ungated,
   *  which is the exact bug this field exists to fix. A default of `true`
   *  would meter signed-in buyers against a browser counter. Neither default
   *  is safe, so every caller has to say. */
  isGuest: boolean;
}

/**
 * What a signed-out browser sees once its free searches are gone (2026-08-31).
 *
 * Builds the same `quota` event shape the SERVER sends, so SearchHome's
 * existing QuotaCard renders a client-side refusal and a server-side one
 * identically — no new UI, and no second way for a refusal to look.
 */
function guestRefusal(cost: number): QuotaEvent {
  return {
    type: "quota",
    // Deliberately the same sentence creditLedger.ts's creditMessage
    // produces for a guest. Duplicated because that module is server-only,
    // and the whole point of this gate is not to call the server. Only the
    // wording is duplicated — the numbers come from credits.ts, which both
    // halves import, so they cannot disagree about the allowance itself.
    message: `You've used your ${GUEST_CREDITS} free credits. Create a free account and you'll get 15 more — enough for a proper shopping session.`,
    kind: "text",
    // Balance and cost, the two numbers a credit meter needs.
    used: guestCredits(),
    limit: cost,
    planId: "guest",
    planName: "Velte credits",
    isGuest: true,
    actorType: "guest",
    // "exhausted", never "unavailable": search IS on this tier, they have
    // used it up. The distinction drives the CTA — see the quota event's own
    // comment in types/search.ts.
    reason: "exhausted",
  };
}

/**
 * Posts to /api/search and reads its newline-delimited JSON stream,
 * dispatching each parsed event to the matching handler. Plain fetch +
 * ReadableStream — no dependency on the Vercel AI SDK's chat protocol. Each
 * call is one turn's "staged reveal"; SearchHome.tsx calls this once per
 * message and supplies `body.history` for conversational context — this
 * function itself has no notion of a thread.
 *
 * `signal` — lets a caller cancel mid-flight (SearchHome.tsx's own Stop
 * button, ChatGPT-style). Aborting cancels both an in-flight fetch AND an
 * already-started body read (the same AbortSignal covers both phases), so
 * Stop works whether the buyer clicks it while still waiting on the
 * response headers or partway through the streamed status lines.
 */
export async function runSearchStream(
  body: SearchRequestBody,
  {
    onStatus,
    onReply,
    onFinal,
    onError,
    onQuota,
    onAbort,
    isGuest,
  }: SearchStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  // Before anything is spent, and gated HERE rather than at the call site
  // because this is the single door every search goes through — a gate a
  // caller has to remember is one a future caller forgets, and the bug being
  // fixed is precisely an allowance nobody enforced. Signed-in callers pass
  // `isGuest: false` and skip it entirely; they are metered properly on their
  // own row by /api/search.
  //
  // CHECKED here, CHARGED when the turn delivers — the same rule the server
  // follows for an account. A guest must not pay for a turn that failed, nor
  // for one answered from the nearby-business path, which costs nothing to
  // have run. The check still comes first, or an empty balance could set a
  // real model call going and never pay for it.
  //
  // A photo turn costs five credits where a text turn costs one — the same
  // ratio the server charges, from the same table. A guest starts with five,
  // so anyone who has searched even once can no longer afford a photo search:
  // photo stays the sign-in hook it has always been, enforced by the pricing
  // rather than by a rule saying so.
  const guestCost = CREDIT_COST[body.imageUrl ? "photo" : "text"];
  if (isGuest && !guestCanAfford(guestCost)) {
    const refusal = guestRefusal(guestCost);
    // Falls back to onError like every other dispatch of this event, so a
    // caller that forgot the handler still shows the buyer something rather
    // than a Send button that appears broken.
    if (onQuota) onQuota(refusal);
    else onError(refusal.message);
    return;
  }

  let res: Response;
  try {
    res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (isAbortError(err)) {
      onAbort?.();
      return;
    }
    onError("Couldn't reach search. Check your connection and try again.");
    return;
  }

  if (!res.body) {
    onError("Search is temporarily unavailable. Please try again shortly.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        dispatch(line);
      }
    }
  } catch (err) {
    if (isAbortError(err)) {
      onAbort?.();
      return;
    }
    onError("Search is temporarily unavailable. Please try again shortly.");
    return;
  }

  if (buffer.trim()) dispatch(buffer);

  function dispatch(line: string) {
    let event: SearchStreamEvent;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.type === "status") onStatus(event.text);
    else if (event.type === "reply") onReply(event.text);
    else if (event.type === "final") {
      // The guest's charge. Charged client-side because a guest has no row
      // on the server to charge — their balance lives in their own browser.
      //
      // The RULE is shared with the server's own charge (lib/turnBillable.ts)
      // rather than mirrored here, which is what this comment used to promise
      // and what a hand-written copy could not keep: the clarification
      // exemption was added on the server first, and this copy went on
      // charging guests for being asked a question — the one population that
      // exemption exists for, since five credits does not survive a four-
      // question intake.
      if (isGuest && isBillableTurn(event)) {
        spendGuestCredits(guestCost);
      }
      onFinal(event);
    } else if (event.type === "error") onError(event.message);
    else if (event.type === "quota") {
      if (onQuota) onQuota(event);
      else onError(event.message);
    }
  }
}

// `fetch`/a ReadableStream reader both reject with something named
// "AbortError" when their signal fires (a DOMException in every browser
// this runs in) — checked via a plain `.name` read rather than
// `instanceof DOMException` so this doesn't care which exact class the
// runtime used, just the one property both use identically. A real network
// failure has a different name and still falls through to the ordinary
// onError path instead of being swallowed as a silent cancel.
function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    err.name === "AbortError"
  );
}
