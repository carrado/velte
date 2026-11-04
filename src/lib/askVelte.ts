import type { useRouter } from "next/navigation";

/** Fired when Ask Velte is submitted while already on `/chat` — SearchHome
 *  listens so a header search still starts a real turn without remounting. */
export const ASK_VELTE_EVENT = "velte:ask";

export type AskVelteDetail = {
  q: string;
  auto: boolean;
};

// Shared by every "ask Velte" composer (Hero, floating bar, header search,
// closing CTA) — same handoff: a real search at /chat, not a fake preview.
// Query-param contract: `q` + `auto=1`. Takes the router instance itself so
// callers pass their own `useRouter()` return value.
export function goAskVelte(
  router: ReturnType<typeof useRouter>,
  text: string,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const href = `/chat?q=${encodeURIComponent(trimmed)}&auto=1`;

  // Already on /chat: the mount-time ?q= effect will not re-run. Dispatch so
  // SearchHome can submit, and keep the URL shareable.
  if (typeof window !== "undefined" && window.location.pathname === "/chat") {
    const detail: AskVelteDetail = { q: trimmed, auto: true };
    window.dispatchEvent(
      new CustomEvent<AskVelteDetail>(ASK_VELTE_EVENT, { detail }),
    );
    window.history.replaceState(null, "", href);
    return true;
  }

  router.push(href);
  return true;
}
