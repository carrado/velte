import { renderOgImage } from "@/lib/og-image";

export const alt =
  "How to Find Real, Trusted Vendors Near You in Nigeria — Velte Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    eyebrow: "Guides",
    title: "How to Find Real, Trusted Vendors Near You",
  });
}
