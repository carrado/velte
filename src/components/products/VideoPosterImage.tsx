"use client";

import { useState } from "react";
import { Video as VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { videoPosterUrl } from "@/lib/bunnyStream";
import type { VideoPosterImageProps } from "@/types/product";

// Bunny generates a video's poster thumbnail as part of transcoding — right
// after upload (or whenever Bunny itself is just running slow) that
// thumbnail URL 404s for a while before it's ready. Rather than the
// browser's broken-image icon, this falls back to a neutral placeholder
// until the poster actually loads; a later view of the same listing loads
// the real poster normally once Bunny has caught up, no retry needed here.
export default function VideoPosterImage({
  videoUrl,
  alt,
  className,
}: VideoPosterImageProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100",
          className,
        )}
      >
        <VideoIcon size={24} className="text-gray-300" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={videoPosterUrl(videoUrl)}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
