import { useCallback, useState } from "react";

import { BellIcon, CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// "Watch price" — the paid tier's headline feature, offered at the moment a
// buyer is looking at something they want but aren't ready to buy.
//
// Placed on the card rather than behind a menu on purpose: this is the
// upgrade prompt that converts best, because it appears when the buyer has
// an actual reason to want it. A refusal here is a plan gate (HTTP 402 from
// the backend), which reads as an offer rather than an error.
//
// Optimistically silent on success: the button just becomes "Watching",
// because a toast on top of a card the buyer is still reading is noise.
export function WatchPriceButton({
  kind,
  productId,
  url,
  label,
  imageUrl,
  merchant,
  priceKobo,
  className,
}: {
  kind: "velte" | "external";
  productId?: string;
  url?: string;
  label: string;
  imageUrl?: string | null;
  merchant?: string | null;
  /** Starting price in kobo. Null when the listing shows no usable price —
   *  the button hides itself entirely rather than offering a watch that
   *  could never fire. */
  priceKobo: number | null;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "watching">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const start = useCallback(
    async (e: React.MouseEvent) => {
      // These buttons sit inside cards that are themselves links.
      e.preventDefault();
      e.stopPropagation();
      if (state !== "idle") return;

      setState("saving");
      setMessage(null);
      try {
        const res = await fetch("/api/price-watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            productId,
            url,
            label,
            imageUrl,
            merchant,
            priceKobo,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (res.status === 401) {
          setState("idle");
          setMessage("Sign in to watch prices.");
          return;
        }
        // 402 is the plan gate — the backend's own wording already says
        // whether it's "Plus only" or "you're at your limit", so it's shown
        // as-is rather than second-guessed here.
        if (res.status === 402) {
          setState("idle");
          setMessage(data?.error ?? "Price watches are a Velte Plus feature.");
          return;
        }
        if (!res.ok) throw new Error(data?.error ?? "Couldn't start watching.");

        setState("watching");
      } catch (err) {
        setState("idle");
        setMessage(
          err instanceof Error ? err.message : "Couldn't start watching.",
        );
      }
    },
    [state, kind, productId, url, label, imageUrl, merchant, priceKobo],
  );

  // Nothing to watch without a starting price — see the prop's comment.
  if (priceKobo == null || priceKobo <= 0) return null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <button
        type="button"
        onClick={start}
        disabled={state !== "idle"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
          state === "watching"
            ? "border-orange-200 bg-orange-50 text-orange-600"
            : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600",
        )}
      >
        {state === "watching" ? (
          <>
            <CheckIcon size={12} className="shrink-0" />
            Watching
          </>
        ) : (
          <>
            <BellIcon size={12} className="shrink-0" />
            {state === "saving" ? "Saving…" : "Watch price"}
          </>
        )}
      </button>
      {message && <p className="text-[11px] text-gray-500">{message}</p>}
    </div>
  );
}
