import type { Metadata } from "next";
import { SearchHome } from "@/components/search/SearchHome";

// Velte buyer-facing search (build-order step d). Moved here from
// `/`, which is now the marketing homepage — anonymous buyers still reach
// this without auth (see publicRoutes in proxy.ts).
export const metadata: Metadata = {
  // `absolute` bypasses the root layout's title template ("%s | Velte") —
  // a plain string here would otherwise double up into
  // "Search | Velte | Velte".
  title: { absolute: "Search | Velte" },
  description:
    "Describe what you need — Velte finds the nearest real vendor who actually has it, then connects you directly.",
};

export default function SearchPage() {
  return <SearchHome />;
}
