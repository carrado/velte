import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Velte | WhatsApp AI Sales Rep | 24/7 Automated Sales Agent",
    template: "%s | WhatsApp AI Sales Rep",
  },
  description:
    "Deploy an intelligent AI agent on your WhatsApp Business number that answers product questions, negotiates prices, checks inventory, and closes sales — 24 hours a day, 7 days a week.",
  keywords: [
    "WhatsApp AI",
    "AI sales agent",
    "WhatsApp Business automation",
    "automated sales",
    "AI chatbot",
    "inventory check",
    "price negotiation",
    "24/7 sales",
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
    title: "Turn WhatsApp Into Your Smartest Sales Rep",
    description:
      "Deploy an intelligent AI agent on your WhatsApp Business number that answers product questions, negotiates prices, checks inventory, and closes sales — 24/7.",
    url: "https://yourdomain.com",
    siteName: "WhatsApp AI Sales Rep",
    images: [
      {
        url: "https://yourdomain.com/og-image.jpg", // Replace with your actual image
        width: 1200,
        height: 630,
        alt: "WhatsApp AI Sales Rep – 24/7 Automated Sales Agent",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Turn WhatsApp Into Your Smartest Sales Rep",
    description:
      "Deploy an intelligent AI agent on your WhatsApp Business number that answers product questions, negotiates prices, checks inventory, and closes sales — 24/7.",
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
    icon: "https://res.cloudinary.com/dbhpul04t/image/upload/v1765811857/favicon_ffn1ja.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans antialiased", inter.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
