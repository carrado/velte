import Image from "next/image";
import Link from "next/link";
import { SparklesIcon } from "@/components/icons";
// Shared between the Listings and Vendors tabs (MarketplaceBrowse /
// VendorsGrid) — sits once, as the last cell of whichever grid it's in.
// `self-start` opts out of CSS Grid's default `align-items: stretch`, which
// would otherwise pad this card out to match the row's tallest sibling —
// a vendor card (sliding cover + avatar + description + sector chips) is
// much taller than this one has any reason to be. No aspect-square image
// area either (unlike the real cards it sits beside) — it's a compact
// prompt, not a listing, so it should read as visibly smaller/lighter.
export function AskVeluxCard({ subtext }: { subtext: string }) {
  return (
    <Link
      href="/chat"
      className="self-start bg-white rounded-2xl border border-orange-100 shadow-sm p-4 flex flex-col items-center text-center gap-1.5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
    >
      <Image
        src="/velte_ai_assistant.png"
        alt=""
        width={40}
        height={40}
        className="rounded-full ring-4 ring-orange-50"
      />
      <p className="text-sm font-semibold text-gray-800 leading-snug flex items-center gap-1.5">
        <SparklesIcon size={13} className="text-orange-500 shrink-0" />
        Still looking?
      </p>
      <p className="text-xs text-gray-500 leading-relaxed">{subtext}</p>
      <span className="text-xs font-semibold text-orange-600">Ask Velte →</span>
    </Link>
  );
}
