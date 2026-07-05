import type { SearchRequestBody, SearchStreamEvent } from "@/types/search";

type FinalEvent = Extract<SearchStreamEvent, { type: "final" }>;

interface SearchStreamHandlers {
  onStatus: (text: string) => void;
  onFinal: (event: FinalEvent) => void;
  onError: (message: string) => void;
}

/**
 * Posts to /api/search and reads its newline-delimited JSON stream,
 * dispatching each parsed event to the matching handler. Plain fetch +
 * ReadableStream — no dependency on the Vercel AI SDK's chat protocol. Each
 * call is one turn's "staged reveal"; SearchHome.tsx calls this once per
 * message and supplies `body.history` for conversational context — this
 * function itself has no notion of a thread.
 */
export async function runSearchStream(
  body: SearchRequestBody,
  { onStatus, onFinal, onError }: SearchStreamHandlers,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
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

  if (buffer.trim()) dispatch(buffer);

  function dispatch(line: string) {
    let event: SearchStreamEvent;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.type === "status") onStatus(event.text);
    else if (event.type === "final") onFinal(event);
    else if (event.type === "error") onError(event.message);
  }
}
