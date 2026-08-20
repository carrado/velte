"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { registerCopiedImage, hashBlob } from "@/lib/copiedImageRegistry";

// Cloudinary uploads from this app always get re-encoded to WebP before
// upload (see uploadProductMedia's own compressImage comment), regardless
// of the original file type — but the Clipboard API's ClipboardItem
// doesn't reliably accept "image/webp" as a valid representation across
// browsers (historically PNG-only, with broader image-type support added
// later but still inconsistent). Found live: copying a photo message
// silently fell back to text-only every time, since the webp write was
// quietly rejected and swallowed by handleCopy's own catch. Re-encoding to
// PNG here — universally accepted — before ever constructing the
// ClipboardItem is what actually fixes it, rather than hoping the browser
// accepts whatever format the fetch happened to return.
async function toPngBlob(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG conversion failed"))),
      "image/png",
    );
  });
}

// A small icon sitting under the BUYER's own chat bubble only (see
// ConversationTurnView's buyer-bubble block in SearchHome.tsx) — per
// explicit request, the AI's own replies don't get this. Always visible,
// no hover-reveal, that swaps to a checkmark for a beat once clicked — the
// icon change IS the feedback, no toast needed for something this
// low-stakes.
//
// lucide-react, not the custom @/components/icons set — per explicit
// request, matching this same search page's OWN composer icons (Camera,
// ArrowUp, Square, X — see SearchHome.tsx's own import comment), which
// already carved out this exact exception scoped to this one surface.
export function CopyMessageButton({
  text,
  imageUrl,
  className,
}: {
  text: string;
  // The turn's REAL uploaded (Cloudinary) URL, never the local blob
  // preview — that object URL is only valid for the render it was created
  // in (see ConversationTurn's own imagePreview comment), so an older turn
  // in history would silently fail to copy its photo if this used that
  // instead. Optional/omitted for a text-only message.
  imageUrl?: string | null;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      // Per explicit request: copying a message that had a photo copies
      // the photo too, as one multi-type clipboard item alongside the
      // text, so pasting it elsewhere reconstructs the original message —
      // "ClipboardItem" in window guards browsers where
      // navigator.clipboard.write (image support specifically) isn't
      // available at all, falling straight to the text-only path below
      // rather than throwing.
      if (imageUrl && typeof ClipboardItem !== "undefined") {
        try {
          const res = await fetch(imageUrl);
          const rawBlob = await res.blob();
          const pngBlob = await toPngBlob(rawBlob);
          // Remembered so a paste-right-back into the composer (see
          // copiedImageRegistry's own comment) can reuse THIS upload
          // instead of creating a redundant duplicate for the same photo.
          void hashBlob(pngBlob).then((hash) =>
            registerCopiedImage(hash, imageUrl),
          );
          const items: Record<string, Blob> = { "image/png": pngBlob };
          if (text) {
            items["text/plain"] = new Blob([text], { type: "text/plain" });
          }
          await navigator.clipboard.write([new ClipboardItem(items)]);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
          return;
        } catch {
          // A fetch/CORS hiccup on the image, or the PNG conversion itself
          // failing — falls through to a plain text-only copy below rather
          // than losing the text too. Silent, same reasoning as the
          // text-only path's own catch further down.
        }
      }
      if (text) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // A real clipboard failure (permission denied, insecure context) is
      // rare enough, and this button low-stakes enough, that a silent no-op
      // beats spending a toast on it — the icon just never flips to a
      // checkmark, which reads as "nothing happened," close enough to the
      // truth.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={copied ? "Copied!" : "Copy"}
      aria-label={copied ? "Copied" : "Copy message"}
      className={cn(
        "-mt-1 inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer",
        className,
      )}
    >
      {copied ? (
        <Check size={13} className="text-emerald-500" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
}
