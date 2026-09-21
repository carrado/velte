import { cn } from "@/lib/utils";
import type { WhatsAppButtonProps } from "@/types/common";
import { WhatsAppIcon } from "@/components/icons";

// Shared across the public store page and the Velte search results
// (build-order step d) — promoted here from a page-local component once a
// second page needed it.
//
// The real WhatsApp glyph (2026-09-21, explicit request), replacing the
// generic MessageCircleIcon this used before — swapped once, here, so every
// call site picks it up automatically. `label` truncates rather than
// wrapping/overflowing (`min-w-0` on the anchor is what lets the truncated
// span actually shrink inside a flex row) — several callers now pass a
// vendor/store name in the label ("Chat {name}"), which has no natural
// length limit.
export function WhatsAppButton({
  href,
  label,
  className,
  onClick,
}: WhatsAppButtonProps) {
  return (
    <a
      href={href}
      rel="noreferrer"
      onClick={onClick}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 active:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors",
        className,
      )}
    >
      <WhatsAppIcon size={17} className="shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}
