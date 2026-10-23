"use client";

import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatNaira } from "@/lib/utils";
import type { HubVendorAdvert, HubVendorBroadcast } from "@/types/hub";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

// The vendor's own pins and drafts, under the timeline. Cancelling a pin
// stops future display with no refund (the pin already ran); discarding a
// draft is free and always available.
export function HubManageLists({
  adverts,
  broadcasts,
  onChanged,
}: {
  adverts: HubVendorAdvert[];
  broadcasts: HubVendorBroadcast[];
  onChanged: () => void;
}) {
  const cancelAdvert = async (id: string) => {
    try {
      await api.post(`/api/hub/adverts/${id}/cancel`, {});
      toast.success("Advert cancelled — it leaves the hub top.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel.");
    }
  };

  const cancelBroadcast = async (id: string) => {
    try {
      await api.post(`/api/hub/broadcasts/${id}/cancel`, {});
      toast.success("Draft discarded.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't discard.");
    }
  };

  return (
    <>
      <section id="hub-pins" aria-label="My pins" className="scroll-mt-24 mt-8">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          My pins
        </p>
        <div className="space-y-2.5">
          {adverts.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              No adverts yet — your first pin shows at the top of the Hub.
            </p>
          )}
          {adverts.map((a) => (
            <div
              key={a.id}
              className="bg-surface rounded-2xl border border-gray-200 p-4 flex items-center gap-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.imageUrl}
                alt=""
                className="w-14 h-14 rounded-xl object-cover bg-gray-50 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">
                  {a.headline}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {a.status === "active"
                    ? `Live · ends ${formatDate(a.endsAt)}`
                    : a.status}
                  {" · "}
                  {a.costKobo === 0 ? "Free" : formatNaira(a.costKobo)}
                  {a.boosted ? " · boosted" : ""}
                </p>
              </div>
              {a.status === "active" && (
                <button
                  type="button"
                  onClick={() => void cancelAdvert(a.id)}
                  className="text-[11px] font-semibold text-gray-400 hover:text-red-600 transition-colors shrink-0"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section
        id="hub-drafts"
        aria-label="Broadcast drafts"
        className="scroll-mt-24 mt-8"
      >
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Broadcast drafts
        </p>
        <div className="space-y-2.5">
          {broadcasts.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              No broadcasts yet — drafts are free, sending opens soon.
            </p>
          )}
          {broadcasts.map((b) => (
            <div
              key={b.id}
              className="bg-surface rounded-2xl border border-gray-200 p-4"
            >
              <p className="text-sm text-ink leading-relaxed">{b.message}</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[11px] text-gray-400 flex-1">
                  {b.status === "draft" ? "Draft — free until sent" : b.status}
                </p>
                {b.status === "draft" && (
                  <button
                    type="button"
                    onClick={() => void cancelBroadcast(b.id)}
                    className="text-[11px] font-semibold text-gray-400 hover:text-red-600 transition-colors shrink-0"
                  >
                    Discard
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
