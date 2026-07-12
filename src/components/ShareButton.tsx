"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ShareButtonProps } from "@/types/common";

// One-tap share for storefronts (growth loop: vendors/buyers reshare a
// storefront link, pulling new buyers into the whole network, not just that
// one shop). Uses the native share sheet where available — on Android/iOS
// this surfaces "WhatsApp Status" directly — and falls back to a wa.me chat
// share + clipboard copy on desktop browsers without navigator.share.
export function ShareButton({
  url,
  title,
  text,
  label = "Share",
  className,
}: ShareButtonProps) {
  const handleShare = async () => {
    const absoluteUrl = url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        toast.error("Couldn't open share sheet");
      }
      return;
    }

    await navigator.clipboard.writeText(absoluteUrl);
    toast.success("Link copied — paste it anywhere to share");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text}\n${absoluteUrl}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-2 text-dash-secondary font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer",
        className,
      )}
    >
      <Share2 size={13} />
      {label}
    </button>
  );
}
