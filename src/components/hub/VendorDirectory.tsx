"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheckIcon,
  HeartIcon,
  LockIcon,
  ShieldCheckIcon,
  StarIcon,
  StoreIcon,
} from "@/components/icons";

import { HubLockedModal } from "@/components/hub/HubLockedModal";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  SECTOR_BY_VALUE,
  SECTOR_CATEGORY_BY_LABEL,
  SECTOR_TAXONOMY,
} from "@/lib/sectors";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { fetchHubVendors, hubPageQueryOptions } from "@/services/hub";
import type { HubDirectoryVendor, HubVendorsDirectory } from "@/types/hub";

const PAGE_SIZE = 9;

/** Sort keys map to fields we actually return for directory vendors. */
type VendorSort =
  | "featured"
  | "top_rated"
  | "most_reviewed"
  | "name_az"
  | "name_za";

const SORT_OPTIONS: { value: VendorSort; label: string }[] = [
  { value: "featured", label: "Featured first" },
  { value: "top_rated", label: "Top rated" },
  { value: "most_reviewed", label: "Most reviewed" },
  { value: "name_az", label: "Name A–Z" },
  { value: "name_za", label: "Name Z–A" },
];

type VerifyFilter = "all" | "verified" | "trusted" | "both";

const VERIFY_OPTIONS: { value: VerifyFilter; label: string }[] = [
  { value: "all", label: "All vendors" },
  { value: "verified", label: "Verified" },
  { value: "trusted", label: "Trusted" },
  { value: "both", label: "Verified & Trusted" },
];

const SLUG_BY_LABEL = Object.fromEntries(
  Object.entries(SECTOR_BY_VALUE).map(([slug, leaf]) => [
    leaf.label.trim().toLowerCase(),
    slug,
  ]),
);

const CATEGORY_BY_SECTOR = Object.fromEntries(
  SECTOR_TAXONOMY.flatMap((category) =>
    category.sectors.map((leaf) => [leaf.value, category.id]),
  ),
);

function sectorSlug(value: string) {
  const raw = value.trim();
  if (SECTOR_BY_VALUE[raw]) return raw;
  return SLUG_BY_LABEL[raw.toLowerCase()] ?? null;
}

function sectorLabel(value: string) {
  return SECTOR_BY_VALUE[value]?.label ?? value.replace(/_/g, " ");
}

/** Parent taxonomy group for a store sector value (slug or display label). */
function sectorGroupId(value: string): string | null {
  const byLabel = SECTOR_CATEGORY_BY_LABEL[value];
  if (byLabel) return byLabel;
  const slug = sectorSlug(value);
  if (!slug) return null;
  return CATEGORY_BY_SECTOR[slug] ?? null;
}

function vendorInSectorGroup(vendor: HubDirectoryVendor, groupId: string) {
  return vendor.sectors.some((value) => sectorGroupId(value) === groupId);
}

function Stars({ avg, count }: { avg: number | null; count: number }) {
  const rated = count > 0 && avg != null;
  const filled = rated ? Math.round(avg) : 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <span className="inline-flex">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon
            key={index}
            size={12}
            weight={index < filled ? "fill" : "regular"}
            className={index < filled ? "text-amber-400" : "text-gray-300"}
          />
        ))}
      </span>
      <span>({count})</span>
    </span>
  );
}

export function VendorDirectoryScreen() {
  const { data, isError, isPending } = useQuery({
    queryKey: queryKeys.hub.vendors,
    queryFn: fetchHubVendors,
    ...hubPageQueryOptions,
  });

  if (isError) {
    return (
      <div className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl p-10 text-center">
        <p className="font-semibold text-ink">Couldn&apos;t load vendors</p>
        <p className="text-sm text-gray-500 mt-1">
          Check your connection and try again.
        </p>
      </div>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-52 rounded-none lg:rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_220px] gap-4">
          <div className="h-80 rounded-none lg:rounded-2xl bg-gray-100" />
          <div className="h-80 rounded-none lg:rounded-2xl bg-gray-100" />
          <div className="h-80 rounded-none lg:rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  return <VendorDirectory data={data} />;
}

function VendorDirectory({ data }: { data: HubVendorsDirectory }) {
  const { navigate } = useNavigation();
  const [sector, setSector] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [trustedOnly, setTrustedOnly] = useState(false);
  const [sort, setSort] = useState<VendorSort>("featured");
  const [page, setPage] = useState(1);

  const verifyFilter: VerifyFilter =
    verifiedOnly && trustedOnly
      ? "both"
      : trustedOnly
        ? "trusted"
        : verifiedOnly
          ? "verified"
          : "all";

  const setVerifyFilter = (value: VerifyFilter) => {
    setVerifiedOnly(value === "verified" || value === "both");
    setTrustedOnly(value === "trusted" || value === "both");
    setPage(1);
  };
  const [favourites, setFavourites] = useState(
    () =>
      new Set(
        data.vendors
          .filter((vendor) => vendor.favourite)
          .map((v) => v.vendorId),
      ),
  );
  const [lock, setLock] = useState<"favourite" | "contact" | null>(null);

  const sectorGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vendor of data.vendors) {
      const groups = new Set(
        vendor.sectors
          .map((value) => sectorGroupId(value))
          .filter((id): id is string => Boolean(id)),
      );
      for (const groupId of groups) {
        counts.set(groupId, (counts.get(groupId) || 0) + 1);
      }
    }
    return SECTOR_TAXONOMY.map((category) => ({
      id: category.id,
      label: category.label,
      count: counts.get(category.id) || 0,
    }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [data.vendors]);

  const filtered = useMemo(() => {
    let list = data.vendors;
    if (sector) {
      list = list.filter((vendor) => vendorInSectorGroup(vendor, sector));
    }
    if (verifiedOnly) list = list.filter((vendor) => vendor.verified);
    if (trustedOnly) list = list.filter((vendor) => vendor.trusted);

    const next = [...list];
    next.sort((a, b) => {
      switch (sort) {
        case "featured":
          if (a.sponsored !== b.sponsored) return a.sponsored ? -1 : 1;
          if (a.verified !== b.verified) return a.verified ? -1 : 1;
          return a.name.localeCompare(b.name);
        case "top_rated":
          return (
            (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0) ||
            b.ratingCount - a.ratingCount ||
            a.name.localeCompare(b.name)
          );
        case "most_reviewed":
          return (
            b.ratingCount - a.ratingCount ||
            (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0) ||
            a.name.localeCompare(b.name)
          );
        case "name_za":
          return b.name.localeCompare(a.name);
        case "name_az":
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return next;
  }, [data.vendors, sector, verifiedOnly, trustedOnly, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const toggleFavourite = async (vendorId: string) => {
    if (!data.premium) {
      setLock("favourite");
      return;
    }
    const saved = favourites.has(vendorId);
    setFavourites((current) => {
      const next = new Set(current);
      if (saved) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
    const res = await fetch(
      saved ? `/api/hub/favourites/${vendorId}` : "/api/hub/favourites",
      {
        method: saved ? "DELETE" : "POST",
        headers: saved ? undefined : { "Content-Type": "application/json" },
        body: saved ? undefined : JSON.stringify({ vendorId }),
      },
    );
    if (res.status === 403) {
      setFavourites((current) => {
        const next = new Set(current);
        if (saved) next.add(vendorId);
        else next.delete(vendorId);
        return next;
      });
      setLock("favourite");
      return;
    }
    if (!res.ok) {
      setFavourites((current) => {
        const next = new Set(current);
        if (saved) next.add(vendorId);
        else next.delete(vendorId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-5">
      <VendorsHero />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_220px] gap-4 items-start">
        <aside className="hidden lg:block space-y-4 lg:sticky lg:top-16">
          <FilterCard title="Sector">
            <ul className="space-y-1">
              <FilterRow
                label="All sectors"
                count={data.vendors.length}
                active={sector === null}
                onClick={() => {
                  setSector(null);
                  setPage(1);
                }}
              />
              {sectorGroups.map((row) => (
                <FilterRow
                  key={row.id}
                  label={row.label}
                  count={row.count}
                  active={sector === row.id}
                  onClick={() => {
                    setSector(row.id);
                    setPage(1);
                  }}
                />
              ))}
            </ul>
          </FilterCard>

          <FilterCard title="Verification Status">
            <label className="flex items-center gap-2 text-sm text-ink py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(event) => {
                  setVerifiedOnly(event.target.checked);
                  setPage(1);
                }}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              Verified Vendor
            </label>
            <label className="flex items-center gap-2 text-sm text-ink py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={trustedOnly}
                onChange={(event) => {
                  setTrustedOnly(event.target.checked);
                  setPage(1);
                }}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              Trusted
            </label>
          </FilterCard>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex w-full items-center gap-2">
            <div className="min-w-0 flex-1 lg:hidden">
              <Select
                value={sector ?? "all"}
                onValueChange={(value) => {
                  if (!value) return;
                  setSector(value === "all" ? null : value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full min-w-0 overflow-hidden h-8 text-xs font-semibold text-gray-600"
                  aria-label="Filter by sector"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {sector
                      ? (sectorGroups.find((row) => row.id === sector)?.label ??
                        "Sector")
                      : "All sectors"}
                  </span>
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  className="min-w-[18rem] w-max max-w-[min(100vw-2rem,24rem)]"
                >
                  <SelectItem value="all">All sectors</SelectItem>
                  {sectorGroups.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 flex-1 lg:hidden">
              <Select
                value={verifyFilter}
                onValueChange={(value) => {
                  if (!value) return;
                  setVerifyFilter(value as VerifyFilter);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full min-w-0 overflow-hidden h-8 text-xs font-semibold text-gray-600"
                  aria-label="Filter by verification"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {VERIFY_OPTIONS.find(
                      (option) => option.value === verifyFilter,
                    )?.label ?? "Verified"}
                  </span>
                </SelectTrigger>
                <SelectContent
                  align="center"
                  alignItemWithTrigger={false}
                  className="min-w-[14rem] w-max"
                >
                  {VERIFY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 flex-1 lg:ml-auto lg:flex-none lg:w-[9.5rem]">
              <Select
                value={sort}
                onValueChange={(value) => {
                  if (!value) return;
                  setSort(value as VendorSort);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full min-w-0 overflow-hidden h-8 text-xs font-semibold text-gray-600"
                  aria-label="Sort vendors"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {SORT_OPTIONS.find((option) => option.value === sort)
                      ?.label ?? "Sort by"}
                  </span>
                </SelectTrigger>
                <SelectContent
                  align="end"
                  alignItemWithTrigger={false}
                  className="min-w-[12rem] w-max"
                >
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {pageItems.length === 0 ? (
            <div className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl p-10 text-center">
              <p className="font-semibold text-ink">No vendors match</p>
              <p className="text-sm text-gray-500 mt-1">
                Try clearing a filter or browsing every sector.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {pageItems.map((vendor) => (
                <DirectoryCard
                  key={vendor.vendorId}
                  vendor={vendor}
                  favourite={favourites.has(vendor.vendorId)}
                  premium={data.premium}
                  onFavourite={() => toggleFavourite(vendor.vendorId)}
                  onContactLocked={() => setLock("contact")}
                />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <Pagination
              page={safePage}
              pageCount={pageCount}
              onChange={setPage}
            />
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-16">
          <section className="rounded-none lg:rounded-2xl border border-orange-100 bg-orange-50 p-4 overflow-hidden">
            <h3 className="text-sm font-bold text-ink">
              Support Local Businesses
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Shop from vendors who list on Velte. Sponsored cards are labelled.
              Ratings appear only after a real review.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hub/vendors-local-promo.jpg"
              alt=""
              className="mt-3 h-24 w-full object-contain"
            />
            <button
              type="button"
              onClick={() => navigate("/hub")}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
            >
              Explore Hub →
            </button>
          </section>

          <section className="rounded-none lg:rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white">
              <ShieldCheckIcon size={18} />
            </span>
            <h3 className="mt-3 text-sm font-bold text-ink">
              Shop with Confidence
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Verified and Trusted badges only appear when the evidence is real
              — never self-selected.
            </p>
          </section>
        </aside>
      </div>

      {lock && (
        <HubLockedModal
          variant="upgrade"
          title={
            lock === "favourite"
              ? "Favourites are Premium"
              : "Contact is Premium"
          }
          body={
            lock === "favourite"
              ? "Premium saves a vendor to your Hub."
              : "Premium opens the vendor's own channel from a Hub card. The store page stays open either way."
          }
          ctaLabel="See Premium"
          ctaHref="/pricing?for=buyers"
          onClose={() => setLock(null)}
        />
      )}
    </div>
  );
}

function VendorsHero() {
  return (
    <section className="relative overflow-hidden rounded-none lg:rounded-2xl bg-ink text-white min-h-[200px] sm:min-h-[220px]">
      <div className="absolute inset-y-0 right-0 w-[48%] hidden sm:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hub/vendors-hero-subject.jpg"
          alt=""
          className="h-full w-full object-cover object-[center_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
        <p
          aria-hidden
          className="pointer-events-none absolute right-4 top-8 max-w-[9rem] text-right text-[11px] font-semibold leading-snug tracking-wide text-white/35 rotate-[-8deg]"
        >
          Local Businesses,
          <br />
          Real People,
          <br />
          Great Deals.
        </p>
        <span className="absolute left-6 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/90 text-white shadow-lg ring-4 ring-white/15">
          <ShieldCheckIcon size={20} />
        </span>
      </div>

      <div className="relative px-5 py-8 sm:px-8 sm:py-10 max-w-xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400">
          Discover
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
          Verified Vendors Near You
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70 max-w-md">
          Find trusted businesses and amazing services from verified vendors in
          your area. Shop with confidence on Velte.
        </p>
      </div>
    </section>
  );
}

function FilterCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl p-4">
      <h3 className="text-sm font-bold text-ink mb-2">{title}</h3>
      {children}
    </section>
  );
}

function FilterRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
        active
          ? "bg-orange-50 text-orange-700 font-semibold"
          : "text-ink hover:bg-gray-50",
      )}
    >
      <span className="truncate">{label}</span>
      <span className="text-[11px] text-gray-400 shrink-0">{count}</span>
    </button>
  );
}

function DirectoryCard({
  vendor,
  favourite,
  premium,
  onFavourite,
  onContactLocked,
}: {
  vendor: HubDirectoryVendor;
  favourite: boolean;
  premium: boolean;
  onFavourite: () => void;
  onContactLocked: () => void;
}) {
  const sector = vendor.sectors[0] ? sectorLabel(vendor.sectors[0]) : null;
  const placeLine = [sector, vendor.place].filter(Boolean).join(" | ");

  return (
    <article className="bg-surface border border-gray-200 rounded-none lg:rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-36 bg-gray-100">
        {vendor.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300">
            <StoreIcon size={28} />
          </div>
        )}
        {vendor.sponsored && (
          <span className="absolute top-2 left-2 rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Sponsored
          </span>
        )}
        <button
          type="button"
          aria-label={favourite ? "Remove favourite" : "Favourite"}
          onClick={onFavourite}
          className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow-sm hover:text-orange-600"
        >
          {!premium ? (
            <LockIcon size={13} />
          ) : (
            <HeartIcon
              size={14}
              className={cn(favourite && "text-orange-600 fill-orange-500")}
            />
          )}
        </button>
      </div>

      <div className="p-3 flex flex-col flex-1">
        {(vendor.verified || vendor.trusted) && (
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 mb-1">
            <BadgeCheckIcon size={13} className="text-teal-600" />
            {vendor.trusted ? "Trusted" : "Verified Vendor"}
          </p>
        )}
        <h3 className="text-sm font-bold text-ink leading-snug line-clamp-2">
          {vendor.name}
        </h3>
        {placeLine && (
          <p className="mt-1 text-[11px] text-gray-500 line-clamp-1">
            {placeLine}
          </p>
        )}
        <div className="mt-2">
          <Stars avg={vendor.ratingAvg} count={vendor.ratingCount} />
        </div>
        <div className="mt-3 mt-auto">
          {premium && vendor.whatsapp ? (
            <a
              href={`https://wa.me/${vendor.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
            >
              Contact
            </a>
          ) : (
            <button
              type="button"
              onClick={onContactLocked}
              className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-ink hover:border-orange-300"
            >
              {!premium && <LockIcon size={12} />}
              Contact
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const pages = useMemo(() => {
    const maxButtons = 5;
    if (pageCount <= maxButtons) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const start = Math.max(1, Math.min(page - 2, pageCount - maxButtons + 1));
    return Array.from({ length: maxButtons }, (_, i) => start + i);
  }, [page, pageCount]);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-ink disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg text-xs font-semibold",
            n === page
              ? "bg-ink text-white"
              : "border border-gray-200 text-ink hover:border-orange-300",
          )}
        >
          {n}
        </button>
      ))}
      {pageCount > 5 && pages[pages.length - 1] < pageCount && (
        <>
          <span className="text-gray-400 text-xs px-1">…</span>
          <button
            type="button"
            onClick={() => onChange(pageCount)}
            className="inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg border border-gray-200 text-xs font-semibold text-ink"
          >
            {pageCount}
          </button>
        </>
      )}
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-ink disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
