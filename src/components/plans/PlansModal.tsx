"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { CloseIcon } from "@/components/icons";
import { CreditsPanel } from "@/components/plans/CreditsPanel";
import { useCredits } from "@/hooks/useCredits";

// Velte credits, as a full-screen modal over the chat (2026-08-31).
//
// Replaces the /plans ROUTE entirely, and then the plans themselves — the
// tiers are gone; this now shows a balance, what each action costs, and the
// top-up packs. A buyer reaching for "Plans" or an
// upgrade prompt is always mid-conversation — they have just been refused a
// price watch, or run out of briefs, or glanced at the header — and sending
// them to another URL for that costs the thread its place: the page unmounts,
// the composer empties, and coming back is a navigation rather than a
// dismissal. A modal keeps the conversation exactly where it was underneath.
//
// The balance is fetched rather than passed down, unlike the old plan table:
// a plan was a static fact about a tier, but a balance changes with every
// search, so it has to be read when the panel opens rather than at page load.
// The COST table is a plain import — credits.ts is client-safe precisely so
// this panel can render prices without a round trip.

interface PlansModalApi {
  /** Opens the plans modal. Safe to call from anywhere inside the chat. */
  open: () => void;
  close: () => void;
}

const PlansModalContext = createContext<PlansModalApi | null>(null);

/**
 * The opener, for any component under the chat shell.
 *
 * Throws when used outside the provider rather than returning a silent no-op:
 * a dead upgrade button is a revenue bug that looks like nothing at all, and
 * it would only ever surface in production. Every consumer today renders
 * inside app/chat/layout.tsx.
 */
export function usePlansModal(): PlansModalApi {
  const api = useContext(PlansModalContext);
  if (!api) {
    throw new Error(
      "usePlansModal must be used inside <PlansModalProvider> (app/chat/layout.tsx).",
    );
  }
  return api;
}

/** A plain button that opens the credits modal, for call sites that were links
 *  to /plans and only ever needed their own styling.
 *
 *  Exists so a component deep inside a render tree doesn't have to call the
 *  hook itself — a hook can't be called conditionally, and several of these
 *  sit inside branches that render only on a refusal. */
export function PlansButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = usePlansModal();
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}

export function PlansModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Stable identity, so every consumer of the context doesn't re-render each
  // time the modal opens or closes — the chat thread is the biggest of them.
  const api = useMemo<PlansModalApi>(
    () => ({ open: () => setIsOpen(true), close: () => setIsOpen(false) }),
    [],
  );

  return (
    <PlansModalContext.Provider value={api}>
      {children}
      <PlansOverlay isOpen={isOpen} onClose={api.close} />
    </PlansModalContext.Provider>
  );
}

function PlansOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { balance, isGuest, topUp, busyPack } = useCredits(isOpen);

  // Escape closes, and the body is locked while it is open — the same
  // treatment DetailSheet gives its own overlay, so the two behave alike.
  // Bound only while open, so a closed modal costs no listener.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="plans"
          role="dialog"
          aria-modal="true"
          aria-label="Velte credits"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          // Covers everything, and owns its own scrolling: the chat shell
          // underneath is `h-dvh overflow-hidden`, so the page itself cannot
          // scroll and this container has to. `overscroll-contain` stops a
          // flick at the end of the plans from scrolling the thread behind it.
          //
          // The same page background /plans used, opaque rather than a dimmed
          // backdrop — this is a surface a buyer reads and compares on, not a
          // dialog they answer. A translucent scrim over a live chat would
          // make a long pricing table hard to read for no benefit.
          className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-[#F1F5F9]"
        >
          {/* Sticky rather than fixed, so it can't drift over the content on
              a phone's soft-keyboard viewport, and stays reachable however
              far down the FAQ someone has read. */}
          <div className="sticky top-0 z-10 flex justify-end bg-[#F1F5F9]/80 px-4 py-3 backdrop-blur-sm sm:px-6">
            <button
              type="button"
              onClick={onClose}
              autoFocus
              aria-label="Close credits"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-[#023337] shadow-sm transition-colors hover:bg-gray-50"
            >
              <CloseIcon size={15} className="shrink-0" />
              Close
            </button>
          </div>

          <CreditsPanel
            balance={balance}
            isGuest={isGuest}
            onTopUp={topUp}
            busyPack={busyPack}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
