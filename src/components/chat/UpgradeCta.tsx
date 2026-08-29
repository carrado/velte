"use client";

import Link from "next/link";

import { SparkleIcon } from "@/components/icons";
import { canUpgrade, useCurrentPlan } from "@/hooks/useCurrentPlan";

// The route into the plans page, in the chat header (2026-08-29).
//
// Hidden on exactly ONE tier — the highest — and shown to everyone else:
// guests, free buyers, vendors, and Plus subscribers who can still move up.
// The decision is the server's (see api/usage/route.ts + isHighestPlan), so
// this component never encodes which plan is the top one.
//
// Renders NOTHING while the plan is still loading rather than a skeleton:
// this sits in a header that is otherwise stable on first paint, and a button
// appearing after a beat is less jarring than a grey box that turns into one
// — or worse, than an "Upgrade" flashing at someone already on Business.
export function UpgradeCta({
  className,
  /** Overridden to "Plans" for signed-out visitors: there is nothing to
   *  upgrade FROM yet, and the word only makes sense once you're on
   *  something. Defaults to "Upgrade" for everyone who has an account. */
  label = "Upgrade",
}: {
  className?: string;
  label?: string;
}) {
  const { data } = useCurrentPlan();
  if (!canUpgrade(data)) return null;

  return (
    <Link
      href="/plans"
      title="See what Velte Plus includes"
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-100"
      }
    >
      <SparkleIcon size={13} className="shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
