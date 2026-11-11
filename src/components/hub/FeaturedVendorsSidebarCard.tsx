"use client";

import Link from "next/link";
import { HubLink } from "@/components/hub/HubLink";
import { CheckIcon, ChevronRightIcon, StarIcon } from "@/components/icons";
import {
  EnterpriseAvatarBadge,
  EnterpriseBadge,
  isEnterpriseVendor,
} from "@/components/EnterpriseBadge";
import type { HubFeaturedVendor } from "@/types/hub";

interface FeaturedVendorsSidebarCardProps {
  vendors: HubFeaturedVendor[];
  maxCount?: number;
}

export function FeaturedVendorsSidebarCard({
  vendors,
  maxCount = 4,
}: FeaturedVendorsSidebarCardProps) {
  if (!vendors || vendors.length === 0) return null;
  // Strictly display only 4 vendors
  const list = vendors.slice(0, 4);

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
        <div>
          <h3 className="text-sm font-bold text-ink">Featured Vendors</h3>
          <p className="text-[11px] text-gray-500 dark:text-ink/60">
            Top businesses on Velte
          </p>
        </div>
        <HubLink
          href="/hub/vendors"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
        >
          <span>View all</span>
          <ChevronRightIcon size={13} />
        </HubLink>
      </div>

      <div className="mt-3 divide-y divide-gray-100 dark:divide-white/5">
        {list.map((vendor) => {
          const isEnterprise = isEnterpriseVendor(vendor);
          const vendorHref = vendor.handle
            ? `/store/${vendor.handle}`
            : "/hub/vendors";

          return (
            <div
              key={vendor.vendorId}
              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
            >
              <HubLink
                href={vendorHref}
                className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-95"
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden ring-1 ring-surface">
                    {vendor.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={vendor.avatar}
                        alt={vendor.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span>{vendor.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {isEnterprise && <EnterpriseAvatarBadge size="sm" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs font-bold text-ink group-hover:text-orange-600 transition-colors truncate">
                      {vendor.name}
                    </span>
                    {isEnterprise && <EnterpriseBadge size="sm" />}
                    {vendor.verified && (
                      <CheckIcon
                        size={12}
                        className="text-orange-500 shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-ink/50 mt-0.5">
                    {vendor.ratingCount > 0 && vendor.ratingAvg != null ? (
                      <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                        <StarIcon size={11} weight="fill" />
                        <span>{vendor.ratingAvg.toFixed(1)}</span>
                      </span>
                    ) : (
                      <span>Vendor</span>
                    )}
                    {vendor.sectors?.[0] && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[100px]">
                          {vendor.sectors[0].replace(/_/g, " ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </HubLink>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
        <HubLink
          href="/hub/vendors"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-orange-300 dark:hover:border-orange-500/30 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 py-2 text-xs font-bold text-ink hover:text-orange-600 transition-all text-center"
        >
          <span>View all vendors</span>
          <ChevronRightIcon size={13} />
        </HubLink>
      </div>
    </section>
  );
}
