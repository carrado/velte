"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Meta Pixel (Facebook/Instagram ad conversion tracking) — no official
// Next.js package for this one (unlike Google Analytics, see layout.tsx's
// <GoogleAnalytics>), so this is the standard base-code-via-next/script
// pattern Meta's own docs use. Quietly renders nothing when the env var
// isn't set, same convention as Web3Forms elsewhere in this app — safe to
// leave unset in local dev, only needs a real value in .env.production.
export default function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();
  // App Router navigation never reloads the page, so the init script's own
  // `fbq('track', 'PageView')` below only ever fires once per session (on
  // first load) — every subsequent client-side route change (home ->
  // /velux, /velux -> a store page, etc.) would otherwise go completely
  // untracked. This re-fires PageView on every pathname change instead, so
  // Meta's Events Manager can actually be broken down by URL to see how
  // often each page (search included) gets visited. Skips the very first
  // render so it doesn't double-count the init script's own PageView.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!pixelId || typeof window.fbq !== "function") return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.fbq("track", "PageView");
  }, [pixelId, pathname]);

  if (!pixelId) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      {/* Fallback pixel for the (now rare) case JS never runs at all —
          Meta's own snippet always pairs the script with this. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
