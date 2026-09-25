"use client";

import { BellIcon } from "@/components/icons/hero";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useBuyerStore } from "@/store/buyerStore";
import { cn } from "@/lib/utils";
import type { BuyerPushPromptProps } from "@/types/buyerRequest";

/** Asks a buyer to turn on push so they hear the moment a business answers
 *  their request (2026-09-24) — the backend pushes on every accept, while
 *  the SMS only goes out on a 3-hourly batch.
 *
 *  Renders nothing whenever asking would be pointless: push unsupported (iOS
 *  Safari outside the installed app has no PushManager), already on, or
 *  blocked — a blocked permission can only be undone in browser settings, so
 *  a button there would do nothing. Shared by the "Request sent" card and
 *  the Your requests page. */
export function BuyerPushPrompt({
  show = true,
  className,
}: BuyerPushPromptProps) {
  const buyer = useBuyerStore((s) => s.buyer);
  const { isSupported, permission, isSubscribed, isLoading, subscribe } =
    usePushNotifications();

  if (
    !show ||
    !buyer ||
    !isSupported ||
    isSubscribed ||
    permission === "denied"
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-orange-100 bg-surface px-4 py-3",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
        <BellIcon size={16} />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-gray-600">
        <span className="font-semibold text-ink">
          Know the moment a business replies.
        </span>{" "}
        Texts can take a few hours — notifications don&apos;t.
      </p>
      <button
        type="button"
        onClick={() => void subscribe()}
        disabled={isLoading}
        className="shrink-0 cursor-pointer rounded-full bg-orange-500 px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-default disabled:opacity-60"
      >
        {isLoading ? "Turning on…" : "Turn on"}
      </button>
    </div>
  );
}
