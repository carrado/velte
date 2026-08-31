"use client";

import { SparkleIcon } from "@/components/icons";
import { usePlansModal } from "@/components/plans/PlansModal";
import { useCredits } from "@/hooks/useCredits";

// The credit gauge, in the chat header and the sidebar menu (2026-08-31).
//
// Was an UPGRADE cta pointing at a tier. There are no tiers now, so the job
// changed: it shows the balance and opens the credits panel. Keeping the
// balance visible is most of what the credit model needs from the UI — a
// prepaid system that hides the number is one people stop trusting.
//
// It no longer hides on anyone. The old rule was "hidden on exactly the top
// tier", which needed a server-side isHighestPlan to stay correct as tiers
// changed; with one balance there is nobody it should be hidden from — a
// guest, a buyer and a vendor all have a number worth seeing.
//
// Renders NOTHING until the balance lands, rather than a skeleton: this sits
// in a header that is otherwise stable on first paint, and a number appearing
// after a beat is far less jarring than a grey box that turns into one — or
// than a "0" that briefly libels someone who has plenty.
export function UpgradeCta({
  className,
  /** Falls back to the balance alone. A label is only passed where the
   *  surrounding UI doesn't already say what the number is. */
  label,
  /** 13 suits the header's small pill; the sidebar's menu rows sit on a
   *  16px icon column and would look off-grid with anything else. */
  iconSize = 13,
  /** The sidebar closes its mobile slide-over when this is pressed — a panel
   *  left open behind the modal is the one thing every slide-over gets
   *  wrong. */
  onClick,
}: {
  className?: string;
  label?: string;
  iconSize?: number;
  onClick?: () => void;
}) {
  const { balance } = useCredits();
  const { open } = usePlansModal();

  if (balance === null) return null;

  return (
    <button
      type="button"
      title="Your Velte credits"
      onClick={() => {
        onClick?.();
        open();
      }}
      className={
        className ??
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-100"
      }
    >
      <SparkleIcon size={iconSize} className="shrink-0" />
      <span className="tabular-nums">
        {label ? `${label} · ${balance}` : balance}
      </span>
    </button>
  );
}
