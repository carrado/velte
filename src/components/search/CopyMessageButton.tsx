"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CopyIcon, CheckIcon } from "@/components/icons";

// A small icon sitting under the BUYER's own chat bubble only (see
// ConversationTurnView's buyer-bubble block in SearchHome.tsx) — per
// explicit request, the AI's own replies don't get this. Always visible,
// no hover-reveal, that swaps to a checkmark for a beat once clicked — the
// icon change IS the feedback, no toast needed for something this
// low-stakes.
export function CopyMessageButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // A real clipboard failure (permission denied, insecure context) is
      // rare enough, and this button low-stakes enough, that a silent no-op
      // beats spending a toast on it — the icon just never flips to a
      // checkmark, which reads as "nothing happened," close enough to the
      // truth.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={copied ? "Copied!" : "Copy"}
      aria-label={copied ? "Copied" : "Copy message"}
      className={cn(
        "-mt-1 inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer",
        className,
      )}
    >
      {copied ? (
        <CheckIcon size={13} className="text-emerald-500" />
      ) : (
        <CopyIcon size={13} />
      )}
    </button>
  );
}
