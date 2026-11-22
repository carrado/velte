"use client";

import type { ReactNode } from "react";
import {
  CrownIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
} from "@/components/icons";
import { Bike, ShieldCheck, ArrowRight, Info, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeliveryMethod } from "@/types/product";

export interface AdminDeliveryOption {
  id: string;
  name: string;
  feeKobo: number;
  estimatedDelivery?: string;
  logo?: string;
}

export type DeliveryInfo = {
  method: DeliveryMethod;
  areas: string[];
  note: string | null;
  /** Dynamically loaded delivery tiers from database configured by admin */
  adminOptions?: AdminDeliveryOption[];
};

function AreasAndNote({ areas, note }: Pick<DeliveryInfo, "areas" | "note">) {
  if (areas.length === 0 && !note) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-white/5 pt-3">
      {areas.length > 0 && (
        <div className="flex flex-wrap items-start gap-1.5">
          <MapPinIcon size={14} className="mt-0.5 shrink-0 text-gray-400" />
          <div className="flex flex-wrap gap-1.5">
            {areas.map((area) => (
              <span
                key={area}
                className="rounded-md bg-gray-100 dark:bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-ink/80"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
      {note && (
        <p className="text-xs leading-relaxed text-gray-500 dark:text-ink/60">
          {note}
        </p>
      )}
    </div>
  );
}

function MethodHeader({
  icon,
  title,
  body,
  accent,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          accent,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-ink/60">
          {body}
        </p>
      </div>
    </div>
  );
}

function IncludedBlock({ delivery }: { delivery: DeliveryInfo }) {
  return (
    <div className="space-y-3">
      <MethodHeader
        icon={
          <TruckIcon
            size={18}
            className="text-emerald-600 dark:text-emerald-400"
          />
        }
        accent="bg-emerald-50 dark:bg-emerald-950/40"
        title="Delivery included by vendor"
        body="This seller delivers this product directly to your location. No separate courier booking required."
      />
      <AreasAndNote areas={delivery.areas} note={delivery.note} />
      <div className="rounded-xl bg-gray-50 dark:bg-white/2 p-2.5 text-xs text-gray-500 dark:text-ink/60 flex items-center gap-2">
        <Info size={14} className="shrink-0 text-gray-400" />
        <span>
          Delivery fee is included in the price or coordinated via chat.
        </span>
      </div>
    </div>
  );
}

export function ProductDeliveryPickup({
  delivery,
  onOpenByol,
}: {
  delivery?: DeliveryInfo | null;
  onOpenByol?: () => void;
}) {
  const resolved: DeliveryInfo = {
    method: delivery?.method ?? "none",
    areas: delivery?.areas ?? [],
    note: delivery?.note ?? null,
    adminOptions: delivery?.adminOptions ?? [],
  };

  const hasAdminOptions = Boolean(
    resolved.adminOptions && resolved.adminOptions.length > 0,
  );

  return (
    <section
      className="mt-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 sm:p-5"
      aria-labelledby="delivery-pickup-heading"
    >
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TruckIcon size={16} className="text-[#ff5500]" />
          <h2
            id="delivery-pickup-heading"
            className="text-sm font-bold text-ink"
          >
            Delivery &amp; Logistics
          </h2>
        </div>
      </div>

      {/* When vendor has included delivery */}
      {resolved.method === "included" && <IncludedBlock delivery={resolved} />}

      {/* When delivery method is none or standard */}
      {resolved.method !== "included" && (
        <div className="space-y-4">
          {/* Admin delivery options list (from DB) — currently empty if not set */}
          {hasAdminOptions ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                Available Platform Couriers
              </p>
              <div className="space-y-2">
                {resolved.adminOptions!.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/2"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs font-bold text-ink">{opt.name}</p>
                        {opt.estimatedDelivery && (
                          <p className="text-[11px] text-gray-500">
                            {opt.estimatedDelivery}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#ff5500]">
                      ₦{(opt.feeKobo / 100).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty state: Platform delivery is managed dynamically from DB set by admin */
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/2 p-3.5 text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-ink/60 leading-relaxed">
                Platform delivery tiers and courier tariffs for this route are
                managed dynamically by the system admin. No default courier is
                currently attached.
              </p>
            </div>
          )}

          {/* BYOL Highlight Banner & CTA Interface */}
          <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-50/70 via-amber-50/40 to-transparent dark:from-orange-950/20 dark:via-white/2 dark:to-transparent p-4 transition-all">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#ff5500] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bike size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-ink">
                    Bring Your Own Logistics (BYOL)
                  </h3>
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-ink/70 leading-relaxed">
                  Send your preferred bike rider, Uber package, or private
                  courier. Velte generates a secret 6-digit pickup code for
                  secure seller handover.
                </p>

                {/* BYOL Action CTA */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenByol}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ff5500] hover:bg-orange-600 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span>Arrange Courier (BYOL)</span>
                    <ArrowRight size={13} />
                  </button>
                  <span className="text-[11px] text-gray-500 dark:text-ink/50 font-medium">
                    No extra platform fee
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
