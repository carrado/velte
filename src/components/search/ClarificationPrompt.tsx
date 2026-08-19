"use client";

import { useEffect, useRef, useState } from "react";
import {
  pickAvoiding,
  gettingLocationPhrase,
} from "@/lib/server/ai/statusPhrases";
import type { BuyerLocation, Clarification } from "@/types/search";
import { SendIcon } from "@/components/icons";

const LOCATION_PHRASE_ROTATE_MS = 1500;
// Generous, not the browser API's own short-feeling default — see
// handleShare's own comment on why an 8s timeout was actively wrong here
// (it doesn't pause for the native permission prompt, so a buyer who takes
// a few seconds to tap "Allow" got a false failure on the first try).
const GEOLOCATION_TIMEOUT_MS = 30000;

// Renders askClarifyingQuestionTool's structured widget metadata (see
// systemPrompt.ts) — the question TEXT itself is already shown above this
// as the turn's normal reply; this is just the answer affordance: a row of
// pill buttons ("choice"), a small dedicated input ("text"), or a real
// device-geolocation action ("location") — deliberately distinct from the
// main composer at the bottom of the page. No internal disabled/loading
// state for "choice"/"text" — the parent appends a new turn the instant
// `onAnswer` fires, which (via the `isLatest` gate in SearchHome) unmounts
// this widget before a double-submit is possible. "location" is the one
// exception: sharing location takes real time (the browser's own
// getCurrentPosition() round-trip), so it needs its own in-flight state —
// see LocationShareAction below.
export function ClarificationPrompt({
  clarification,
  onAnswer,
  onLocationShared,
}: {
  clarification: Clarification;
  onAnswer: (text: string) => void;
  // Only actually called for a "location" clarification — see
  // LocationShareAction. Kept as its own callback rather than overloading
  // `onAnswer` with a location payload: a shared location carries real
  // coordinates that need to ride along on the NEXT search call, not just
  // text a buyer typed, so the parent needs to tell those two cases apart
  // structurally, not by sniffing the string.
  onLocationShared: (location: BuyerLocation) => void;
}) {
  const [value, setValue] = useState("");

  if (clarification.kind === "location") {
    return (
      <LocationShareAction onShared={onLocationShared} onDecline={onAnswer} />
    );
  }

  // "name" is handled entirely by SearchHome.tsx's own composer (the same
  // dedicated single-line swap phone/OTP already gets — see nameCapture's
  // own comment there), never rendered inline here — the parent gates this
  // component from ever mounting for a "name" clarification in the first
  // place (ConversationTurnView's own `turn.clarification.kind !== "name"`
  // check), so this is just a defensive no-op, not the real gate.
  if (clarification.kind === "name") {
    return null;
  }

  if (clarification.kind === "choice") {
    return (
      <div className="flex flex-wrap gap-2">
        {clarification.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onAnswer(option)}
            className="px-4 py-2 rounded-full border border-orange-200 bg-orange-50/50 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        onAnswer(trimmed);
      }}
      className="flex items-center gap-1.5 bg-white rounded-xl border border-orange-200 pl-3.5 pr-1.5 h-11 max-w-md focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer…"
        className="flex-1 min-w-0 h-full outline-none text-sm bg-transparent"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        title="Send"
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white transition-colors"
      >
        <SendIcon size={14} />
      </button>
    </form>
  );
}

// The "location" clarification's own answer affordance — a real
// getCurrentPosition() call, not a typed reply. Split out from
// ClarificationPrompt itself so its own in-flight/error state doesn't leak
// into the simpler "choice"/"text" branches above.
function LocationShareAction({
  onShared,
  onDecline,
}: {
  onShared: (location: BuyerLocation) => void;
  onDecline: (text: string) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "fetching" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  // Last few phrases already shown THIS fetch — pickAvoiding's own repeat
  // guard, same mechanism route.ts uses server-side for the main search
  // status line (see statusPhrases.ts), just driven by a client interval
  // instead of tool-call progress.
  const shownRef = useRef<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards a getCurrentPosition() callback that resolves AFTER the buyer
  // already gave up and clicked "Cancel"/"Search without it" — the browser
  // call itself can't be cancelled (the Geolocation API has no abort), so
  // without this a slow, late "Allow" click still fires onShared and
  // silently starts a search the buyer already told this widget to skip.
  const cancelledRef = useRef(false);

  // Belt-and-braces cleanup if the buyer navigates away/this unmounts mid
  // fetch (e.g. a new turn already appended for some other reason) — an
  // orphaned interval would otherwise keep ticking and calling setState on
  // an unmounted component.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function rotatePhrase() {
    const next = pickAvoiding(gettingLocationPhrase(), shownRef.current);
    shownRef.current = [...shownRef.current, next].slice(-3);
    setStatusText(next);
  }

  function handleShare() {
    if (!navigator.geolocation) {
      setPhase("error");
      return;
    }
    cancelledRef.current = false;
    setPhase("fetching");
    rotatePhrase();
    intervalRef.current = setInterval(rotatePhrase, LOCATION_PHRASE_ROTATE_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (cancelledRef.current) return;
        onShared({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (cancelledRef.current) return;
        // Swallowed to the buyer as a plain retry-or-decline state, but the
        // specific code matters for debugging "why didn't this work" — 1 is
        // a real permission denial, 2 is the OS/browser reporting no fix at
        // all, 3 is just the timeout expiring.
        console.warn(
          `[location] geolocation failed (code ${err.code}): ${err.message}`,
        );
        setPhase("error");
      },
      // `timeout` keeps ticking while the browser's own native permission
      // dialog is sitting there waiting for a tap — it does NOT pause for
      // it. A short timeout here doesn't mean "location is slow," it means
      // "the buyer hadn't tapped Allow yet," and firing an error at that
      // point is actively wrong: found live — the first tap "failed" this
      // way, then the second tap succeeded instantly because permission had
      // already been granted in the background by then. Generous on
      // purpose: a real hang is still recoverable via Cancel below, so
      // there's no cost to waiting instead of guessing wrong.
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  }

  function handleCancel() {
    cancelledRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("idle");
  }

  if (phase === "fetching") {
    return (
      <div className="flex items-center gap-2.5">
        {/* Same shimmering-text treatment as the main turn-loading status
            line (see globals.css's .status-shimmer) — one consistent
            "Velte is actively working on this" visual language across the
            chat, and the rotation itself (a new phrase every
            LOCATION_PHRASE_ROTATE_MS) is what actually makes it read as
            dynamic, not just decorated. */}
        <span className="status-shimmer truncate text-sm font-medium min-w-0">
          {statusText}
        </span>
        {/* A generous timeout (see handleShare's own comment) means this
            can sit here a while if the buyer is slow to respond to their
            browser's own permission prompt — Cancel is what keeps that
            from ever being a dead end instead of just a wait. */}
        <button
          type="button"
          onClick={handleCancel}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }

  // 2026-08-19: dropped the pin-badge icon that used to sit ahead of these
  // two buttons, and swapped their rounded-full (pill/circular) radius for
  // a slight one — both per explicit request. Buttons now stand on their
  // own, no icon.
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleShare}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/25 transition-colors hover:bg-orange-600 cursor-pointer"
        >
          Share my location
        </button>
        {/* Secondary, on purpose — a real bordered button (not a bare text
            link) so it reads as an equally valid second choice, but the
            neutral gray/white keeps "Share" as the visually primary path. */}
        <button
          type="button"
          onClick={() => onDecline("Search without sharing my location")}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 cursor-pointer"
        >
          Search without it
        </button>
      </div>
      {phase === "error" && (
        <p className="text-xs text-red-500">
          Couldn&apos;t get your location — check your browser/device
          permission, or search without it above.
        </p>
      )}
    </div>
  );
}
