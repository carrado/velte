import type { ReactNode } from "react";

import type { HubFeed } from "@/types/hub";
import { HubAdvertCard } from "../HubAdvertCard";
import { HubProductPost } from "./HubProductPost";
import { HubBroadcastPost } from "./HubBroadcastPost";
import { HubSideNav } from "./HubSideNav";
import { HubRightRail } from "./HubRightRail";

type TimelineEntry =
  | { kind: "advert"; id: string; node: ReactNode }
  | { kind: "post"; id: string; at: number; node: ReactNode };

// Facebook-style three-column Hub: left shortcuts, a narrow chronological
// center timeline mixing uploads + labelled paid pins + broadcasts, right
// discovery rail. Paid pins are guaranteed visibility (newest first, then
// re-injected down the scroll) because advertisers pay for reach —
// chronology orders everything else, never buries the pins.
export function HubFeedView({
  feed,
  audience,
  viewerVendorId,
  createSlot,
  manageSlot,
  insightsSlot,
}: {
  feed: HubFeed;
  audience: "vendor" | "buyer";
  viewerVendorId?: string | null;
  /** Vendor only: the "share something" prompt + create modal trigger. */
  createSlot?: ReactNode;
  /** Vendor only: pins/drafts management, rendered under the feed. */
  manageSlot?: ReactNode;
  /** Vendor only: insights teaser/lock, rendered under management. */
  insightsSlot?: ReactNode;
}) {
  const adverts = feed.adverts;
  const posts: { id: string; at: number; node: ReactNode }[] = [
    ...feed.products.map((p) => ({
      id: `p-${p.id}`,
      at: new Date(p.createdAt).getTime() || 0,
      node: (
        <HubProductPost
          product={p}
          isOwn={!!viewerVendorId && p.vendorId === viewerVendorId}
        />
      ),
    })),
    ...feed.broadcasts.map((b) => ({
      id: `b-${b.id}`,
      at: new Date(b.sentAt).getTime() || 0,
      node: <HubBroadcastPost post={b} />,
    })),
  ].sort((a, b) => b.at - a.at);

  // Newest pin leads; the rest re-inject every 6 posts down the scroll.
  const [firstAdvert, ...restAdverts] = adverts;
  const timeline: TimelineEntry[] = [];
  if (firstAdvert) {
    timeline.push({
      kind: "advert",
      id: `a-${firstAdvert.id}`,
      node: <HubAdvertCard advert={firstAdvert} />,
    });
  }
  let advertIdx = 0;
  posts.forEach((post, i) => {
    timeline.push({ kind: "post", id: post.id, at: post.at, node: post.node });
    if ((i + 1) % 6 === 0 && restAdverts.length > 0) {
      const advert = restAdverts[advertIdx % restAdverts.length];
      advertIdx += 1;
      timeline.push({
        kind: "advert",
        id: `a-${advert.id}-${i}`,
        node: <HubAdvertCard advert={advert} />,
      });
    }
  });

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:gap-6 items-start">
      <div className="hidden lg:block sticky top-20">
        <HubSideNav audience={audience} />
      </div>

      <div className="max-w-xl w-full mx-auto">
        {createSlot}
        <div id="hub-feed" className="space-y-4 scroll-mt-24">
          {timeline.length === 0 && (
            <div className="bg-surface rounded-2xl border border-gray-200 p-10 text-center">
              <p className="font-semibold text-ink">Quiet here for now</p>
              <p className="text-sm text-gray-500 mt-1">
                New uploads and promotions will appear in this timeline.
              </p>
            </div>
          )}
          {timeline.map((entry) => (
            <div key={entry.id}>{entry.node}</div>
          ))}
        </div>
        {manageSlot}
        {insightsSlot}
      </div>

      <div className="hidden lg:block sticky top-20">
        <HubRightRail feed={feed} audience={audience} />
      </div>
    </div>
  );
}
