import type { SearchRequestBody, SearchStreamEvent } from "@/types/search";

type FinalEvent = Extract<SearchStreamEvent, { type: "final" }>;

interface SearchStreamHandlers {
  onStatus: (text: string) => void;
  // A standalone bubble arriving mid-turn, before `onFinal` — see
  // SearchStreamEvent's own "reply" comment.
  onReply: (text: string) => void;
  onFinal: (event: FinalEvent) => void;
  onError: (message: string) => void;
  // Called instead of onError when `signal` fired (the buyer hit Stop) —
  // a deliberate cancel, not a real failure, so SearchHome.tsx can give it
  // its own quiet "Stopped generating." wrap-up rather than the scarier
  // "couldn't reach search" wording onError uses. Optional so any other
  // caller (there are none today, but this stays a plain library function,
  // not SearchHome-specific) isn't forced to handle a case it never
  // triggers by never passing a signal.
  onAbort?: () => void;
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
  { onStatus, onReply, onFinal, onError, onAbort }: SearchStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
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
    else if (event.type === "final") onFinal(event);
    else if (event.type === "error") onError(event.message);
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
