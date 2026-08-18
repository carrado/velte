import { cn } from "@/lib/utils";
import type { WhatsAppButtonProps } from "@/types/common";
import { MessageCircleIcon } from "@/components/icons";

// Shared across the public store page and the Velte search results
// (build-order step d) — promoted here from a page-local component once a
// second page needed it.
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
        "inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 active:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors",
        className,
      )}
    >
      <MessageCircleIcon size={17} />
      {label}
    </a>
  );
}
