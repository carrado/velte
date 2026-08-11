import { renderOgImage } from "@/lib/og-image";

export const alt = "Velte Blog — guides for buyers and vendors in Nigeria";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    eyebrow: "Blog",
    title: "Guides for buyers and vendors in Nigeria",
  });
}
