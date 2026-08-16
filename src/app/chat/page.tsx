import type { Metadata } from "next";
import { SearchHome } from "@/components/search/SearchHome";

// Velte buyer-facing search (build-order step d). Moved here from
// `/`, which is now the marketing homepage — anonymous buyers still reach
// this without auth (see publicRegardlessOfAuth in proxy.ts).
//
// Route history: started as /search, renamed to /velux (2026-08) to match
// the AI's own persona name at the time, renamed again to /chat (2026-08-16)
// once that persona was retired — "Velux" collided with the real,
// internationally known Velux (roof windows/skylights) trademark, and the
// AI's own system prompt had never called itself Velux anyway (it's always
// self-identified as "Velte" — see systemPrompt.ts). Consolidating to one
// name (Velte) end to end meant the route needed a plain, functional name
// instead of a persona name to match — /chat, since that's what every
// "ask Velte" composer on the site (Hero, FloatingAskBar, FinalAskCta)
// already hands off to, and what this page actually is.
export const metadata: Metadata = {
  // `absolute` bypasses the root layout's title template ("%s | Velte") —
  // a plain string here would otherwise double up into "Chat | Velte |
  // Velte".
  title: { absolute: "Chat | Velte" },
  description:
    "Describe what you need — Velte finds the nearest real vendor who actually has it, then connects you directly.",
};

export default function ChatPage() {
  return <SearchHome />;
}
