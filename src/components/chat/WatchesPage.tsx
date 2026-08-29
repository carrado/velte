"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

import { BellIcon, CloseIcon } from "@/components/icons";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { fetchMyWatches, removeWatch } from "@/services/priceWatch";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import { cn } from "@/lib/utils";
import type { PriceWatch } from "@/types/priceWatch";

// "Watching" — the buyer's own list of price watches.
//
// The counterpart to the Watch price button: creating a watch without
// anywhere to see or cancel it is a feature a buyer can't trust, because
// they can't tell whether it's still running.
//
// Deliberately read-only apart from Remove. Editing a target price is a form
// with its own validation and error states, and it isn't what makes the
// feature valuable — being told when something gets cheaper is. Left out
// until someone actually asks for it.

const naira = (kobo: number) =>
  `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;

function WatchRow({
  watch,
  onRemove,
  removing,
}: {
  watch: PriceWatch;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  // Against the START price, not the last one: "cheaper than when you saved
  // it" is the number the buyer actually cares about, and the one that
  // justifies the subscription. A rise shows as no saving rather than a
  // negative, which would read as a bill.
  const saved = watch.startPriceKobo - watch.lastPriceKobo;
  const hasDropped = saved > 0;

  const body = (
    <>
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50">
        {watch.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={watch.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BellIcon size={16} className="text-gray-300" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#023337]">
          {watch.label}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          {watch.merchant ??
            (watch.kind === "velte" ? "Velte vendor" : "Online")}
          {watch.lastCheckedAt
            ? ` · checked ${new Date(watch.lastCheckedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`
            : " · not checked yet"}
        </p>
        <p className="mt-1 text-sm">
          {hasDropped ? (
            <>
              <span className="text-gray-400 line-through">
                {naira(watch.startPriceKobo)}
              </span>{" "}
              <span className="font-bold text-[#023337]">
                {naira(watch.lastPriceKobo)}
              </span>{" "}
              <span className="font-semibold text-orange-600">
                −{naira(saved)}
              </span>
            </>
          ) : (
            <span className="font-bold text-[#023337]">
              {naira(watch.lastPriceKobo)}
            </span>
          )}
        </p>
        {watch.targetPriceKobo != null && (
          <p className="mt-0.5 text-[11px] text-gray-500">
            Alerting under {naira(watch.targetPriceKobo)}
          </p>
        )}
      </div>
    </>
  );

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3 transition-opacity",
        removing && "opacity-50",
      )}
    >
      {/* External watches link out to the listing; a Velte watch has no url
          on it (the product lives on a storefront), so it stays plain text
          rather than becoming a link to nowhere. */}
      {watch.url ? (
        <a
          href={watch.url}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          {body}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
      )}
      <button
        type="button"
        onClick={() => onRemove(watch._id)}
        disabled={removing}
        aria-label={`Stop watching ${watch.label}`}
        className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
      >
        <CloseIcon size={14} />
      </button>
    </li>
  );
}

export function WatchesPage() {
  // Either kind of account can own watches — a vendor watching competitors
  // is signed in on a different cookie and lives in a different store, so
  // checking only the buyer one would show them the sign-in prompt while
  // they were already signed in.
  const buyer = useBuyerStore((s) => s.buyer);
  const vendor = useUserStore((s) => s.user);
  const signedIn = Boolean(buyer || vendor);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["price-watches"],
    queryFn: fetchMyWatches,
    // Only meaningful for a signed-in account — the API returns an empty
    // list for anyone else, and asking for it would be a wasted round trip.
    enabled: signedIn,
  });

  const remove = useMutation({
    mutationFn: removeWatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-watches"] });
    },
    onError: () => {
      toast.error("Couldn't remove that watch. Please try again.");
    },
  });

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <BellIcon size={28} className="mx-auto text-gray-300" />
        <h1 className="mt-4 text-lg font-bold text-[#023337]">
          Sign in to see your watches
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Velte can watch a price for you and let you know when it drops.
        </p>
        <div className="mt-6 flex justify-center">
          <GoogleSignInButton />
        </div>
      </div>
    );
  }

  const watches = data?.watches ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-[#023337]">Watching</h1>
        <p className="mt-1 text-sm text-gray-500">
          We check these regularly and email you when the price drops.
        </p>
      </header>

      {isLoading && (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
            />
          ))}
        </ul>
      )}

      {isError && (
        <p className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500">
          Couldn&apos;t load your watches just now. Refresh to try again.
        </p>
      )}

      {!isLoading && !isError && watches.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <BellIcon size={24} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-[#023337]">
            You&apos;re not watching anything yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Search for something, then tap{" "}
            <span className="font-semibold">Watch price</span> on any result.
            We&apos;ll take it from there.
          </p>
          <Link
            href="/chat"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Start a search
          </Link>
        </div>
      )}

      {watches.length > 0 && (
        <ul className="space-y-2">
          {watches.map((watch) => (
            <WatchRow
              key={watch._id}
              watch={watch}
              onRemove={(id) => remove.mutate(id)}
              removing={remove.isPending && remove.variables === watch._id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
