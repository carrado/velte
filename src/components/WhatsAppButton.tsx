import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhatsAppButtonProps } from "@/types/common";

// Shared across the public store page and the Velte search results
// (build-order step d) — promoted here from a page-local component once a
// second page needed it.
export function WhatsAppButton({
  href,
  label,
  className,
}: WhatsAppButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 active:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors",
        className,
      )}
    >
      <MessageCircle size={17} />
      {label}
    </a>
  );
}
