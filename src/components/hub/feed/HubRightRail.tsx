import Link from "next/link";

import { ProtectedImage } from "@/components/ProtectedImage";
import { StoreIcon } from "@/components/icons/hero";
import { optimizedImageUrl } from "@/lib/cloudinary";
import type { HubFeed } from "@/types/hub";

// Right discovery rail: suggested businesses + the honesty note. The note
// matters as much as the suggestions — anyone can read why a pin sits at the
// top, which is what keeps paid placement from reading as endorsement.
export function HubRightRail({
  feed,
  audience,
}: {
  feed: HubFeed;
  audience: "vendor" | "buyer";
}) {
  const suggested = feed.vendors.slice(0, 3);

  return (
    <div className="space-y-4">
      {suggested.length > 0 && (
        <section
          aria-label="Suggested businesses"
          className="bg-surface rounded-2xl border border-gray-200 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1 pb-2">
            {audience === "vendor" ? "On the Hub" : "Businesses to explore"}
          </p>
          <div className="space-y-1">
            {suggested.map((v) => (
              <Link
                key={v.vendorId as string}
                href={`/store/${v.handle}`}
                className="flex items-center gap-2.5 px-1 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <span className="w-9 h-9 rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  {v.avatar ? (
                    <ProtectedImage
                      src={optimizedImageUrl(v.avatar)}
                      alt={v.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <StoreIcon size={15} className="text-gray-300" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-ink truncate">
                    {v.name}
                  </span>
                  <span className="block text-[11px] text-gray-400 truncate">
                    {(v.sectors ?? []).slice(0, 2).join(" · ") ||
                      "Velte vendor"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section
        aria-label="About Hub placement"
        className="bg-surface rounded-2xl border border-gray-200 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1 pb-2">
          Why am I seeing this?
        </p>
        <p className="text-xs text-gray-500 leading-relaxed px-1">
          Posts labelled <span className="font-semibold">Sponsored</span> are
          paid pins — position, never endorsement. Everything else is newest
          first.
        </p>
      </section>
    </div>
  );
}
