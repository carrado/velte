// A tiny, ephemeral cross-component cache — NOT real app state, just an
// optimization detail — so that copying an image from a chat bubble
// (CopyMessageButton) and pasting it right back into the composer
// (SearchHome's handleComposerPaste/handleImageFile) reuses the ORIGINAL
// Cloudinary upload instead of creating a redundant duplicate for
// pixel-identical content. Module-level rather than React state/context:
// CopyMessageButton (one per turn) and the composer (the parent) are
// different components with no natural shared state to put this in, and
// this genuinely doesn't need to trigger a re-render anywhere — it's read
// once, synchronously, at the moment a paste happens.
//
// Keyed by a hash of the PNG bytes actually written to the clipboard
// (see CopyMessageButton's own toPngBlob) — not the original upload's own
// bytes, since those are WebP and never touch the clipboard at all. The
// OS clipboard stores an image "file" item's bytes verbatim, so hashing
// the pasted File later reproduces the exact same hash, deterministically.
//
// Capped and FIFO-evicted — a real cache would need this for correctness
// at scale; here it's purely so a long session doesn't accumulate entries
// forever for what's a single browser tab's worth of copy actions.
const MAX_ENTRIES = 20;
const registry = new Map<string, string>();

export function registerCopiedImage(hash: string, url: string): void {
  registry.set(hash, url);
  if (registry.size > MAX_ENTRIES) {
    const oldest = registry.keys().next().value;
    if (oldest !== undefined) registry.delete(oldest);
  }
}

export function lookupCopiedImage(hash: string): string | undefined {
  return registry.get(hash);
}

// SHA-256 via the Web Crypto API — available in every browser this app
// already requires a secure context for anyway (Clipboard API has the
// same requirement). Returns a plain hex string, cheap to use as a Map key.
export async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
