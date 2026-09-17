"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// A circular avatar with a graceful fallback (2026-09-04) — found live: a
// buyer's avatar showed as a plain broken-image icon right after Google
// sign-in. Every call site rendering an avatar already had a correct
// fallback for the "no avatar URL at all" case (a single initial on the
// brand-orange fill), but none of them had an `onError` handler on the
// `<img>` itself — so a URL that FAILED to load (a stale Google photo, an
// ad-blocker/privacy extension blocking googleusercontent.com, a transient
// network hiccup) had nowhere to go but the browser's own broken-image
// glyph, never the fallback that already existed one line away.
//
// This is the one place that decision lives now: `src` present AND loading
// successfully shows the image, anything else — no `src`, or an `onError`
// — shows `label`. Same fallback for both, which is the fix: a broken
// remote URL now degrades exactly like having no avatar, not worse.
//
// `referrerPolicy="no-referrer"` for the same reason ExternalOfferCard.tsx
// already sets it on merchant-hosted photos: these URLs come from arbitrary
// third-party hosts (Google, Cloudinary, whatever a vendor uploaded to),
// and there's no reason for that host's own logs to see Velte's URL.
export function Avatar({
  src,
  alt = "",
  /** Shown when there's no `src`, or the image failed to load — usually
   *  the result of getInitial(name) or an inline initial computation. */
  label,
  className,
  /** "lazy" for an avatar in a long list (RequestsPage's own responder
   *  rows) — omitted (browser default, effectively eager) for the one or
   *  two identity chips a header/sidebar ever shows at once. */
  loading,
}: {
  src: string | null | undefined;
  alt?: string;
  label: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500 text-xs font-bold text-white",
        className,
      )}
    >
      {showImage ? (
        // Arbitrary third-party host (Google, Cloudinary, whatever a
        // vendor uploaded to) — not one next/image's configured domains
        // can cover, same reasoning as ExternalOfferCard.tsx's own images.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={alt}
          loading={loading}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{label}</span>
      )}
    </span>
  );
}
