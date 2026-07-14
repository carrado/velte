import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Providers from "./providers";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const VELTE_ICON =
  "https://res.cloudinary.com/dbhpul04t/image/upload/v1779845711/velte_manifest_qdphtb.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://velte.ng"),
  title: {
    default: "Velte Connect | Let AI Bring Buyers Straight To Your Shop",
    template: "%s | Velte Connect",
  },
  description:
    "Velte Connect is an AI discovery engine that matches buyers to nearby vendors by what they need, then hands them straight to your WhatsApp to close the sale. Now onboarding vendors in Enugu.",
  keywords: [
    "Velte Connect",
    "AI vendor discovery",
    "buyer to vendor matching",
    "WhatsApp sales",
    "Enugu vendors",
    "AI shopping assistant",
    "find local vendors",
    "AI marketplace Nigeria",
  ],
  authors: [{ name: "Velte Technologies", url: "https://velte.ng" }],
  creator: "Velte Technologies",
  publisher: "Velte Technologies",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Let AI Bring Buyers Straight To Your Shop",
    description:
      "A buyer describes what they need — our AI matches them to nearby vendors and hands them straight to WhatsApp to close the sale. Join the Velte Connect vendor waitlist in Enugu.",
    url: "https://velte.ng",
    siteName: "Velte Connect",
    images: [
      {
        url: VELTE_ICON,
        width: 1000,
        height: 1000,
        alt: "Velte Connect",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Let AI Bring Buyers Straight To Your Shop",
    description:
      "A buyer describes what they need — our AI matches them to nearby vendors and hands them straight to WhatsApp to close the sale. Join the Velte Connect vendor waitlist in Enugu.",
    images: [VELTE_ICON],
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
    icon: VELTE_ICON,
    shortcut: VELTE_ICON,
    apple: VELTE_ICON,
  },
  verification: {
    other: {
      "facebook-domain-verification": "7q3uw3yspdq5xr4ieiougzye5oecxu",
    },
  },
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
          {children}
          <Toaster
            position="top-right"
            richColors
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
