import Link from "next/link";

import { ProtectedImage } from "@/components/ProtectedImage";
import { BadgeCheckIcon, SendIcon, StoreIcon } from "@/components/icons/hero";
import { optimizedImageUrl } from "@/lib/cloudinary";
import type { HubBroadcastPost } from "@/types/hub";

// A sent broadcast rendered inline on the timeline. Renders nothing until the
// send path ships — the shape is ready, the audience isn't, and this card
// never previews drafts (a draft is the vendor thinking out loud, not news).
export function HubBroadcastPost({ post }: { post: HubBroadcastPost }) {
  return (
    <article className="bg-surface rounded-2xl border border-orange-200/70 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
          {post.avatar ? (
            <ProtectedImage
              src={optimizedImageUrl(post.avatar)}
              alt={post.storeName ?? "Vendor broadcast"}
              className="w-full h-full object-cover"
            />
          ) : (
            <StoreIcon size={15} className="text-orange-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-ink truncate flex items-center gap-1">
            <span className="truncate">{post.storeName ?? "Velte vendor"}</span>
            {post.verified && (
              <BadgeCheckIcon
                size={13}
                className="text-orange-500 shrink-0 fill-orange-500/15"
              />
            )}
          </p>
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <SendIcon size={11} className="shrink-0" />
            Broadcast
          </p>
        </div>
        {post.storeHandle && (
          <Link
            href={`/store/${post.storeHandle}`}
            className="text-[11px] font-semibold text-orange-600 hover:underline shrink-0"
          >
            View store
          </Link>
        )}
      </div>
      <div className="px-4 pb-4">
        <p className="text-sm text-ink leading-relaxed">{post.message}</p>
        {post.imageUrl && (
          <div className="mt-3 rounded-xl overflow-hidden bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={optimizedImageUrl(post.imageUrl)}
              alt=""
              className="w-full aspect-[16/9] object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </article>
  );
}
