"use client";

import { useState } from "react";

import { CREDIT_COST } from "@/lib/credits";
import { guestCanAfford, spendGuestCredits } from "@/lib/guestCredits";
import { CHANNEL_PHRASE } from "@/lib/priceChannels";
import { fmt } from "@/lib/product-price";
import { useCreditsModal } from "@/components/credits/CreditsModal";
import {
  fetchNegotiationBrief,
  type BriefRefusal,
} from "@/services/priceBrief";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import type {
  NegotiationBrief as BriefData,
  PriceBand as PriceBandData,
} from "@/types/search";

// "What should I actually offer?" — the negotiation brief (2026-08-31).
//
// Sits under the fair-price band as its own strip, and the split is
// deliberate: the band is an ANSWER and stays uninteractive by design (see
// PriceBand.tsx's header, which is still true — the control lives here, not
// there). This is a thing you choose to DO about that answer, and it spends
// one of a metered allowance, so it has to be a deliberate act. A brief that
// appeared automatically would quietly burn a free buyer's two on the first
// two searches they ran, neither of which they meant to haggle over.
//
// Unboxed and container-less like every other block in the thread — this is
// Velte still talking, not a panel dropped into the conversation.

const naira = (kobo: number) => fmt(kobo / 100, "₦");

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; brief: BriefData }
  | { kind: "refused"; refusal: BriefRefusal }
  | { kind: "error" };

export function NegotiationBrief({ band }: { band: PriceBandData }) {
  // Both account kinds, for the reason PriceBand.tsx gives: a vendor browsing
  // /chat is on a different cookie and is metered on their own row, so reading
  // only the buyer store would show a signed-in vendor a sign-in prompt.
  const buyer = useBuyerStore((s) => s.buyer);
  const vendor = useUserStore((s) => s.user);
  const signedIn = Boolean(buyer || vendor);
  const { open: openCredits } = useCreditsModal();

  const [state, setState] = useState<State>({ kind: "idle" });

  // Only over a band that can actually answer. Decided server-side and carried
  // on the band (see PriceBand.negotiable) so the rule lives next to the data
  // it judges — an offer over a band with no real range would be a button that
  // can only ever fail.
  //
  // `!== false` rather than `=== true`: conversations persisted before this
  // shipped rehydrate with the field absent, and those bands are perfectly
  // capable of producing a brief. Requiring `true` would silently withdraw the
  // feature from every reopened conversation.
  if (band.negotiable === false) return null;

  async function askForBrief() {
    // A guest pays from their browser-side balance, because the server has no
    // row to charge them against. There is no feature gate any more — under
    // credits a guest CAN buy a brief if they have the credits, which makes it
    // the best demo Velte has: they see the thing Velte is actually sold on
    // before being asked for anything.
    //
    // CHECKED here, CHARGED after the brief comes back — the same rule the
    // server follows. A brief that couldn't be built (too little price data)
    // must not cost anything.
    const cost = CREDIT_COST.brief;
    if (!signedIn && !guestCanAfford(cost)) {
      setState({
        kind: "refused",
        refusal: {
          message: `A negotiation brief costs ${cost} credits. Create a free account for 15 more.`,
          balance: 0,
          cost,
          isGuest: true,
        },
      });
      return;
    }

    setState({ kind: "loading" });
    try {
      const { brief, refusal } = await fetchNegotiationBrief(band);
      if (brief) {
        if (!signedIn) spendGuestCredits(cost);
        setState({ kind: "ready", brief });
      } else if (refusal) setState({ kind: "refused", refusal });
      else setState({ kind: "error" });
    } catch {
      setState({ kind: "error" });
    }
  }

  if (state.kind === "ready") return <BriefBlock brief={state.brief} />;

  if (state.kind === "refused") {
    return (
      <div className="mt-3 space-y-1.5">
        {/* Written server-side (or, for a guest, next to the gate that
            refused them) so there is one place the wording of "you can't
            afford this" lives. */}
        <p className="text-sm text-[#023337]">{state.refusal.message}</p>
        <button
          type="button"
          onClick={openCredits}
          className="cursor-pointer text-sm font-semibold text-orange-500 hover:text-orange-600"
        >
          {state.refusal.isGuest ? "Create a free account" : "Top up credits"}
        </button>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="mt-3 text-sm text-gray-500">
        I couldn&apos;t work out an offer just now — try again in a moment.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={askForBrief}
        disabled={state.kind === "loading"}
        className="text-sm font-semibold text-orange-500 hover:text-orange-600 disabled:text-gray-400"
      >
        {state.kind === "loading"
          ? "Working it out…"
          : "What should I offer? →"}
      </button>
    </div>
  );
}

function BriefBlock({ brief }: { brief: BriefData }) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-gray-500">
        How to play it with {CHANNEL_PHRASE[brief.channel]}:
      </p>

      {/* Three numbers, in the order they get used: what you say first, what
          you're aiming at, and the point where you stop. Any other order and
          the buyer has to work out which one to open with. */}
      <ul className="space-y-1">
        <Figure label="Open at" value={naira(brief.openKobo)} lead />
        <Figure label="Aim for" value={naira(brief.targetKobo)} />
        <Figure label="Walk away above" value={naira(brief.walkKobo)} />
      </ul>

      {/* The part people actually use. Set apart as speech because it is meant
          to be said word for word, not paraphrased. */}
      <p className="border-l-2 border-orange-200 py-0.5 pl-3 text-sm text-[#023337] italic">
        &ldquo;{brief.openingLine}&rdquo;
      </p>

      <ul className="space-y-1 px-2.5">
        {brief.points.map((point, i) => (
          <li key={i} className="text-xs text-gray-500">
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Figure({
  label,
  value,
  lead = false,
}: {
  label: string;
  value: string;
  lead?: boolean;
}) {
  return (
    <li
      className={
        // The opening number is the one being acted on, so it is the only row
        // carrying any weight — the same treatment the cheapest market gets in
        // the band above it.
        lead
          ? "flex items-baseline justify-between gap-3 rounded-lg bg-orange-50 px-2.5 py-1.5"
          : "flex items-baseline justify-between gap-3 px-2.5 py-1.5"
      }
    >
      <span className="min-w-0 truncate text-sm text-gray-600">{label}</span>
      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-[#023337]">
        {value}
      </span>
    </li>
  );
}
