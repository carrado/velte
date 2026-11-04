import type { ReactNode } from "react";

import {
  CrownIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { DeliveryMethod } from "@/types/product";

/**
 * Product-page Delivery & pickup block (Phase A mock).
 * Method / areas / note from the listing. Partner rows on `none` are
 * informational teasers — fees attach at checkout when Phase C lands.
 * @see docs/delivery-integration-plan.md
 *
 * Colours ride the theme ramp in globals.css (gray + tinted -50/-100 and
 * text -600…-900). Prefer those over raw /opacity washes that muddy in dark.
 */

/** Placeholder partners until a real logistics contract exists. */
const MOCK_PARTNERS = [
  {
    id: "vendrush",
    name: "Vendrush",
    initial: "V",
    tint: "bg-sky-100 text-sky-700",
    feeHint: "Fee at checkout",
  },
  {
    id: "lifepadi",
    name: "LifePadi",
    initial: "L",
    tint: "bg-emerald-100 text-emerald-700",
    feeHint: "Fee at checkout",
  },
  {
    id: "kwik",
    name: "Kwik Delivery",
    initial: "K",
    tint: "bg-orange-100 text-orange-700",
    feeHint: "Fee at checkout",
  },
  {
    id: "gokada",
    name: "Gokada",
    initial: "G",
    tint: "bg-violet-100 text-violet-700",
    feeHint: "Fee at checkout",
  },
] as const;

type Delivery = {
  method: DeliveryMethod;
  areas: string[];
  note: string | null;
};

function AreasAndNote({ areas, note }: Pick<Delivery, "areas" | "note">) {
  if (areas.length === 0 && !note) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
      {areas.length > 0 && (
        <div className="flex flex-wrap items-start gap-1.5">
          <MapPinIcon size={14} className="mt-0.5 shrink-0 text-gray-400" />
          <div className="flex flex-wrap gap-1.5">
            {areas.map((area) => (
              <span
                key={area}
                className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
      {note && <p className="text-xs leading-relaxed text-gray-500">{note}</p>}
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
    <div className="flex gap-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          accent,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{body}</p>
      </div>
    </div>
  );
}

function IncludedBlock({ delivery }: { delivery: Delivery }) {
  return (
    <>
      <MethodHeader
        icon={<TruckIcon size={18} className="text-orange-600" />}
        accent="bg-orange-50"
        title="Delivery included"
        body="Vendor delivers this order. You don’t arrange a courier."
      />
      <AreasAndNote areas={delivery.areas} note={delivery.note} />
      <p className="mt-3 text-xs text-gray-500">
        Fee: arranged with the vendor (in the price or confirmed in chat).
      </p>
    </>
  );
}

function NoneBlock({ delivery }: { delivery: Delivery }) {
  return (
    <>
      <MethodHeader
        icon={<PackageIcon size={18} className="text-sky-600" />}
        accent="bg-sky-50"
        title="Pickup / arrange logistics"
        body="Vendor does not deliver. At checkout you can pick a Velte logistics partner and see their fee."
      />
      <AreasAndNote areas={delivery.areas} note={delivery.note} />

      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Partners at checkout
        </p>
        <ul
          className="velte-scrollbar max-h-[9.5rem] space-y-2 overflow-y-auto overscroll-contain pr-1"
          aria-label="Delivery partners"
        >
          {MOCK_PARTNERS.map((partner) => (
            <li
              key={partner.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                  partner.tint,
                )}
                aria-hidden
              >
                {partner.initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{partner.name}</p>
                <p className="text-[11px] text-gray-500">
                  Preview — not selectable here
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-gray-500">
                {partner.feeHint}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
        <CrownIcon size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-xs leading-relaxed text-amber-900">
          <span className="font-semibold text-amber-800">Premium:</span> bring
          your own courier (BYOL) and get a pickup code at checkout.
        </p>
      </div>
    </>
  );
}

function ByolBlock({ delivery }: { delivery: Delivery }) {
  return (
    <>
      <MethodHeader
        icon={<PackageIcon size={18} className="text-violet-600" />}
        accent="bg-violet-50"
        title="Bring your own courier"
        body="You arrange pickup. After payment Velte shows a short code for your courier; the vendor confirms it on handover."
      />
      <AreasAndNote areas={delivery.areas} note={delivery.note} />
    </>
  );
}

export function ProductDeliveryPickup({
  delivery,
}: {
  delivery?: Delivery | null;
}) {
  const resolved: Delivery = {
    method: delivery?.method ?? "none",
    areas: delivery?.areas ?? [],
    note: delivery?.note ?? null,
  };

  return (
    <section
      className="mt-5 rounded-2xl border border-gray-200 bg-surface p-4"
      aria-labelledby="delivery-pickup-heading"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="delivery-pickup-heading" className="text-sm font-bold text-ink">
          Delivery &amp; pickup
        </h2>
        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Preview
        </span>
      </div>

      {resolved.method === "included" && <IncludedBlock delivery={resolved} />}
      {resolved.method === "byol" && <ByolBlock delivery={resolved} />}
      {resolved.method === "none" && <NoneBlock delivery={resolved} />}
    </section>
  );
}
