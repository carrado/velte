import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Providers from "./providers";
import { Toaster } from "sonner";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import ReferralCapture from "@/components/ReferralCapture";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// iOS launch images (apple-touch-startup-image). iOS ignores the manifest for its
// splash, so each device size needs its own image + media query. Filenames match
// pwa-asset-generator's default `apple-splash-<w>-<h>.png` output (see README/run
// command in the repo) so the generated files drop straight in. Any device not
// matched just falls back to the in-app AppInitOverlay splash — no breakage.
const APPLE_SPLASH_SCREENS: { url: string; media: string }[] = [
  // ── iPhones (portrait) ──
  {
    url: "/splash/apple-splash-1290-2796.png",
    media:
      "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1179-2556.png",
    media:
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1284-2778.png",
    media:
      "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1170-2532.png",
    media:
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1125-2436.png",
    media:
      "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1242-2688.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-828-1792.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1242-2208.png",
    media:
      "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-750-1334.png",
    media:
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-640-1136.png",
    media:
      "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  // ── iPads (portrait) ──
  {
    url: "/splash/apple-splash-2048-2732.png",
    media:
      "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1668-2388.png",
    media:
      "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1668-2224.png",
    media:
      "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1620-2160.png",
    media:
      "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1536-2048.png",
    media:
      "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
];

export const metadata: Metadata = {
  title: {
    default: "Velte | Find anything nearby",
    template: "%s | Velte",
  },
  description:
    "Describe what you need — Velte finds the nearest real vendor who actually has it, then connects you directly.",
  keywords: [
    "Velte",
    "product search Nigeria",
    "find vendors near me",
    "AI shopping assistant",
    "local marketplace search",
  ],
  authors: [{ name: "Your Company Name", url: "https://yourcompany.com" }],
  creator: "Your Company Name",
  publisher: "Your Company Name",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Velte | Find anything nearby",
    description:
      "Describe what you need — Velte finds the nearest real vendor who actually has it, then connects you directly.",
    url: "https://yourdomain.com",
    siteName: "Velte",
    images: [
      {
        url: "https://yourdomain.com/og-image.jpg", // Replace with your actual image
        width: 1200,
        height: 630,
        alt: "Velte – find anything nearby",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Velte | Find anything nearby",
    description:
      "Describe what you need — Velte finds the nearest real vendor who actually has it, then connects you directly.",
    images: ["https://yourdomain.com/twitter-image.jpg"], // Replace
    creator: "@yourtwitterhandle",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/velte_manifest.png", type: "image/png" }],
    shortcut: "/velte_manifest.png",
    apple: "/velte_manifest.png",
  },
  manifest: "/site.webmanifest",
  // Launch standalone (no browser chrome) and use a translucent iOS status bar so
  // the app content runs edge-to-edge behind it — the native-app feel.
  appleWebApp: {
    capable: true,
    title: "Velte",
    statusBarStyle: "black-translucent",
    startupImage: APPLE_SPLASH_SCREENS,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

// Black theme color so the OS chrome / PWA splash strip matches the dark launch
// experience (never the old whitish light-mode value) + viewport-fit:cover so
// env(safe-area-inset-*) is populated on notched devices.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // resizes-content: on-screen keyboard shrinks the layout viewport itself
  // (so 100dvh containers reflow), instead of the default resizes-visual
  // where the keyboard overlays a full-height layout and the browser just
  // scrolls the visual viewport — that scroll is what was pushing the
  // header off the top and the search input off the bottom on mobile.
  interactiveWidget: "resizes-content",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans antialiased", inter.variable)}>
      <body>
        <Providers>
          <ServiceWorkerRegistrar />
          <ReferralCapture />
          {children}
          <Toaster
            position="top-right"
            richColors
            // Sonner's default mobile offset is a flat 16px from every edge —
            // it doesn't know about the iOS notch/status bar or Android's
            // cutouts. With viewportFit:"cover" this app draws under those
            // areas, so the toast needs the same env(safe-area-inset-*)
            // padding already used for the header/bottom bars elsewhere,
            // or it renders clipped/overlapping the status bar on mobile.
            mobileOffset={{
              top: "calc(env(safe-area-inset-top) + 16px)",
              right: "calc(env(safe-area-inset-right) + 16px)",
            }}
            toastOptions={{
              classNames: {
                error: "bg-red-600 text-white border-red-600",
                success: "bg-green-600 text-white border-green-600",
                warning: "bg-yellow-500 text-black border-yellow-500",
                info: "bg-blue-600 text-white border-blue-600",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
