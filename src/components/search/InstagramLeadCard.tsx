"use client";

import { toast } from "sonner";

import type { InstagramLead } from "@/types/search";
import {
  ExternalLinkIcon,
  MessageCircleIcon,
  StoreIcon,
} from "@/components/icons/hero";

// A public Instagram business page turned up by a scoped Google search on a
// genuine STORE dead end (2026-09-15) — see InstagramLead's own comment in
// types/search.ts for why this exists alongside Google Places.
//
// Same deliberate non-styling as ExternalBusinessCard: a visible "Not yet on
// Velte" label so it's never mistaken for an actual listing, and no
// address/distance at all — unlike a Places result, a search hit carries no
// verified location, so this never claims one.
//
// "Message on Instagram" (2026-09-16, explicit request) — the one thing a
// Velte vendor card has that this used to lack: a way to actually reach the
// business from here, not just look them up. Instagram's own DM deep link
// (ig.me/m/<handle>) opens the thread but takes NO prefilled text — there is
// no supported way to hand it a message — so the button copies the intro to
// the clipboard first and then opens the thread, and the toast tells the
// buyer to paste. The message asks for the service in the buyer's own terms
// and introduces Velte with a join link, so every reach-out doubles as a
// vendor recruitment touch. Falls back to a plain profile link for a lead
// persisted before `handle` existed.

function buildIntroMessage(lead: InstagramLead, origin: string): string {
  const need = lead.need?.trim();
  const where = lead.location?.trim();
  const ask = need
    ? `I'm looking for ${need}${where ? ` in ${where}` : ""} — are you available, and could you share your prices?`
    : "I'd like to ask about your services — are you available, and could you share your prices?";
  return [
    `Hi! I found your page through Velte (${origin}). ${ask}`,
    "",
    `Velte is a marketplace where buyers nearby find vendors like you and message them directly. You can list your business for free at ${origin}/join so more customers can find you.`,
  ].join("\n");
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Recruitment-lead beacon (2026-09-16) — a buyer reaching out to an unlisted
// business with a Velte intro in hand is the strongest recruitment signal
// there is, so it's recorded, best-effort, the same way a WhatsApp handoff
// is (see reportLead.ts): sendBeacon first so it survives the tab handing
// off to Instagram, keepalive fetch as the fallback, and never anything
// that could delay or fail the click itself.
function logReachOut(lead: InstagramLead): void {
  if (!lead.handle) return;
  try {
    const url = "/api/search/instagram-reachout";
    const body = JSON.stringify({
      handle: lead.handle,
      url: lead.url,
      title: lead.title,
      need: lead.need ?? null,
      location: lead.location ?? null,
    });
    const queued =
      typeof navigator !== "undefined" &&
      !!navigator.sendBeacon &&
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    if (!queued) {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* bookkeeping never interferes with the reach-out itself */
  }
}

export function InstagramLeadCard({ lead }: { lead: InstagramLead }) {
  const dmUrl = lead.handle
    ? `https://ig.me/m/${encodeURIComponent(lead.handle)}`
    : null;

  const onMessage = async () => {
    if (!dmUrl) return;
    logReachOut(lead);
    // Open synchronously in the click handler — a popup opened after an
    // await gets blocked by most mobile browsers, and the DM thread is the
    // whole point. The copy runs alongside it.
    const win = window.open(dmUrl, "_blank", "noopener,noreferrer");
    const copied = await copyText(
      buildIntroMessage(lead, window.location.origin),
    );
    if (copied) {
      toast.success("Message copied — paste it into the Instagram chat.");
    } else {
      toast.message(
        "Couldn't copy the message automatically — tell them you found them on Velte.",
      );
    }
    if (!win) {
      // Popup blocked: fall back to a same-tab navigation so the buyer
      // still lands in the thread.
      window.location.href = dmUrl;
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-dashed border-gray-200 p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <StoreIcon size={16} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-1 min-w-0">
            {lead.title}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          Not yet on Velte
        </span>
      </div>

      {lead.snippet && (
        <p className="text-xs text-gray-500 line-clamp-2">{lead.snippet}</p>
      )}

      <div className="flex gap-2">
        {dmUrl && (
          <button
            type="button"
            onClick={onMessage}
            className="flex items-center justify-center gap-1.5 flex-1 h-11 rounded-xl bg-orange-500 text-white hover:bg-orange-600 text-sm font-semibold transition-colors"
          >
            <MessageCircleIcon size={16} />
            Message on Instagram
          </button>
        )}
        <a
          href={lead.url}
          target="_blank"
          rel="noreferrer"
          aria-label="View on Instagram"
          className={
            dmUrl
              ? "flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
              : "flex items-center justify-center gap-1.5 w-full h-11 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
          }
        >
          {dmUrl ? null : "View on Instagram"}
          <ExternalLinkIcon size={14} />
        </a>
      </div>
    </div>
  );
}
