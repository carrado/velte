import type { useRouter } from "next/navigation";

// Shared by every "ask Velte" composer on the homepage (Hero, the floating
// bar, the closing CTA) — same handoff Hero's own composer always used:
// a real search at /chat, not a fake preview of one. Kept as one function
// rather than three copies so the query-param contract (q + auto=1) only
// ever lives in one place. Takes the router instance itself (not a path
// string) so callers just pass their own `useRouter()` return value.
export function goAskVelte(
  router: ReturnType<typeof useRouter>,
  text: string,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  router.push(`/chat?q=${encodeURIComponent(trimmed)}&auto=1`);
  return true;
}
