"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api-client";
import { formatNaira } from "@/lib/utils";
import type { HubContext, HubVendorAdvert } from "@/types/hub";

// Broadcast drafts. Reach is opted-in buyers only, capped per tier per day —
// both enforced at SEND time. Sending itself (and its charge) ships with the
// notification-preferences + fan-out slice; until then this saves drafts,
// which are free, and says so.
export function HubBroadcastComposer({
  context,
  adverts,
  onSaved,
}: {
  context: HubContext;
  adverts: HubVendorAdvert[];
  onSaved: () => void;
}) {
  const [message, setMessage] = useState("");
  const [advertId, setAdvertId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!message.trim() || saving) return;
    setSaving(true);
    try {
      await api.post("/api/hub/broadcasts", {
        message: message.trim().slice(0, 280),
        imageUrl: null,
        advertId: advertId || null,
      });
      toast.success("Broadcast drafted — free until it's sent.");
      setMessage("");
      setAdvertId("");
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't save this broadcast.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
      <h3 className="font-bold text-ink">New broadcast</h3>
      <p className="text-xs text-gray-500 mt-1">
        Drafts are free · sending costs {formatNaira(context.broadcastCostKobo)}{" "}
        and reaches opted-in buyers only ({context.sendsPerDay} per day on your
        tier)
      </p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={280}
        rows={3}
        placeholder="One sharp message — e.g. New Ankara arrivals just landed. This weekend only."
        className="mt-4 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none"
      />
      <div className="mt-1 text-right text-[11px] text-gray-400">
        {message.length}/280
      </div>

      {adverts.length > 0 && (
        <select
          value={advertId}
          onChange={(e) => setAdvertId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-orange-500/40"
        >
          <option value="">Standalone broadcast</option>
          {adverts
            .filter((a) => a.status === "active")
            .map((a) => (
              <option key={a.id} value={a.id}>
                Boost: {a.headline.slice(0, 60)}
              </option>
            ))}
        </select>
      )}

      <button
        type="button"
        onClick={() => void save()}
        disabled={!message.trim() || saving}
        className="mt-4 w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save draft — free"}
      </button>
    </div>
  );
}
