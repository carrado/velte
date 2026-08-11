import { renderOgImage } from "@/lib/og-image";

export const alt =
  "How to Start Selling on WhatsApp in Nigeria: A Complete Guide — Velte Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    eyebrow: "Guides",
    title: "How to Start Selling on WhatsApp in Nigeria",
  });
}
