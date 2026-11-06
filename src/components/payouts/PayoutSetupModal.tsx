"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";

import { payoutsApi } from "@/services/payouts";
import { queryKeys } from "@/lib/query-keys";
import { BuildingIcon } from "@/components/icons/hero";
import PayoutAccountForm from "./PayoutAccountForm";
import { modalScrimClass } from "@/lib/modalScrim";

/* First-run gate: a vendor with no payout account on file can't be paid, so
   the dashboard asks for one before anything else and won't take no for an
   answer — no close button, no Escape, no click-outside.
 *
 * It FAILS OPEN, and that is the important part. The modal appears only on a
 * definite `null` from the server. A failed or still-loading request renders
 * nothing, because the alternative is trapping a vendor behind an
 * undismissable dialog during a backend blip — locked out of orders and
 * wallet both, with no way forward but closing the tab. An outage must never
 * be indistinguishable from "you haven't set this up". */

export default function PayoutSetupModal() {
  // The bank list portals into this element rather than `document.body`.
  // The dialog sits at z-[9998]; a list portaled to the body at z-50 renders
  // underneath it, so the options are visible through the backdrop but can't
  // be clicked. `null` until the node is committed — the portal waits instead
  // of falling back to the body for that first paint.
  const [popupContainer, setPopupContainer] = useState<HTMLDivElement | null>(
    null,
  );

  const { data: payout, isSuccess } = useQuery({
    queryKey: queryKeys.payouts.account,
    queryFn: () => payoutsApi.get(),
  });

  const blocked = isSuccess && payout === null;

  // The dialog owns the viewport while it's up, so the page behind it must
  // not scroll — on a phone a backdrop alone still leaves the body draggable.
  useEffect(() => {
    if (!blocked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [blocked]);

  // Nothing to portal into during the server render, and `blocked` is false
  // there regardless — the query can't have resolved yet.
  if (!blocked) return null;

  return createPortal(
    // Portaled to body for the same reason LogoutModal is: rendered inline,
    // the backdrop only covers its scrollable ancestor, not the viewport.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payout-setup-title"
      className={`fixed inset-0 z-[9998] h-dvh w-dvw flex items-center justify-center p-4 ${modalScrimClass()}`}
    >
      {/* The bank list portals into this wrapper, which is a sibling of the
          scrolling card rather than a child of it. Two things otherwise break
          the options: portaling to `document.body` paints them under this
          z-[9998] overlay, and `overflow-y-auto` on the card itself clips
          whatever does render. */}
      <div ref={setPopupContainer} className="relative w-full max-w-lg my-auto">
        <div className="bg-surface max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 px-5 sm:px-6 pt-5 sm:pt-6">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <BuildingIcon size={17} className="text-orange-500" />
            </div>
            <div>
              <h3
                id="payout-setup-title"
                className="text-dash-heading font-bold text-gray-900"
              >
                Add your payout account
              </h3>
              <p className="text-dash-secondary text-gray-400 mt-0.5">
                Where we send your money after a customer&apos;s order is
                confirmed
              </p>
            </div>
          </div>

          <div className="px-5 sm:px-6 pt-5">
            <p className="text-dash-secondary text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
              We need this before customers can check out from your store. It
              takes a minute — pick your bank and enter your account number.
            </p>
          </div>

          <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4">
            {/* No onCancel: there is nowhere to go back to. The form closes this
              by writing the account, which flips the query off `null`. */}
            <PayoutAccountForm
              saveLabel="Save & Continue"
              popupContainer={popupContainer}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
