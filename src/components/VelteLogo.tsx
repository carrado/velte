"use client";

import Image, { type ImageProps } from "next/image";

import { useTheme } from "@/components/ThemeProvider";

// The wordmark, theme-aware (2026-09-10).
//
// `velte_logo_esn5dj.png` is a flat raster image — orange "V" + near-black
// "ELTE" baked into one file. In dark mode the ELTE half turned invisible
// against a dark page, and there's no CSS filter that can recolor HALF of a
// raster image (a blanket invert/brightness filter would also turn the
// orange V white, which is wrong — the V stays orange in both themes, only
// the "ELTE" it's black text problem needed fixing).
//
// So this swaps to a SECOND static asset in dark mode — velte_logo_dark.png,
// generated once by a pixel-level recolor script (same technique the
// existing velte_logo_light.png comment describes for its own dark PANEL):
// every near-black pixel becomes white, every orange pixel is left exactly
// as it was. Not velte_logo_light.png itself — that one recolors the V to
// yellow-400 for a specific orange-toned gradient panel (BuyerAuthShell)
// where the brand orange didn't have enough contrast; the app's actual dark
// MODE is a neutral near-black, where the brand orange reads fine on its
// own and swapping it would just be off-brand.
//
// One component rather than each of the dozen call sites doing
// `resolved === "dark" ? ... : ...` itself, for the reason any such lookup
// gets centralised: a fourteenth call site written six months from now
// should not have a chance to forget the swap exists.
const LIGHT_SRC = "/velte_logo_esn5dj.png";
const DARK_SRC = "/velte_logo_dark.png";

export function VelteLogo({
  alt = "Velte",
  ...props
}: Omit<ImageProps, "src" | "alt"> & { alt?: string }) {
  const { resolved } = useTheme();
  return (
    <Image
      src={resolved === "dark" ? DARK_SRC : LIGHT_SRC}
      alt={alt}
      {...props}
    />
  );
}
