import { useEffect, useState } from "react";

// Reveals `text` progressively, one character at a time, simulating Velte
// "typing" its reply — purely a client-side animation over text that
// already arrived complete. route.ts streams a "staged reveal" (status
// events, then ONE final event with the full reply), not a token-by-token
// stream — see SearchHome.tsx's own build-order comment on why streamText
// was deliberately not adopted — so there's no real partial text to key
// off; this fakes the same feel over the already-final string instead.
//
// Does NOT reset if `text` changes after mount — by design, not an
// oversight: every current caller (TypewriterReply, the idle-screen
// greeting) mounts this already holding its final string and never changes
// it afterward, so there's nothing to reset for. Reaching for this hook
// against text that mutates post-mount will just look wrong (it won't
// re-play), not crash — a real constraint, not a bug, given the callers
// this was built for.
export function useTypewriter(text: string, speedMs = 14): string {
  const [visibleLength, setVisibleLength] = useState(0);

  useEffect(() => {
    if (!text) return;
    const id = setInterval(() => {
      setVisibleLength((len) => {
        const next = len + 1;
        if (next >= text.length) clearInterval(id);
        return Math.min(next, text.length);
      });
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);

  return text.slice(0, visibleLength);
}
