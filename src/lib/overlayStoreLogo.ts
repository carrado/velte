/** Paint the vendor logo onto an AI poster before Cloudinary upload.
 *  Returns the original poster file unchanged when logo is missing or
 *  cannot be drawn (CORS / load failure) — generation must still succeed. */

function loadImage(src: string, anonymous = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (anonymous) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load image"));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Couldn't export poster"));
          return;
        }
        resolve(new File([blob], name, { type: "image/png" }));
      },
      "image/png",
      0.92,
    );
  });
}

/**
 * Overlay `logoUrl` in the bottom-left of a poster (base64 PNG/JPEG).
 * Soft white badge behind the mark so it reads on busy creatives.
 */
export async function overlayStoreLogoOnPoster(
  posterBase64: string,
  mimeType: string,
  logoUrl: string | null | undefined,
): Promise<File> {
  const posterFile = (() => {
    const binary = atob(posterBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], "ai-poster.png", {
      type: mimeType || "image/png",
    });
  })();

  const url = logoUrl?.trim();
  if (!url) return posterFile;

  try {
    const poster = await loadImage(
      `data:${mimeType || "image/png"};base64,${posterBase64}`,
    );
    // Cloudinary (and most CDNs) allow anonymous canvas reads.
    const logo = await loadImage(url, true);

    const canvas = document.createElement("canvas");
    canvas.width = poster.naturalWidth || poster.width;
    canvas.height = poster.naturalHeight || poster.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return posterFile;

    ctx.drawImage(poster, 0, 0, canvas.width, canvas.height);

    const pad = Math.round(canvas.width * 0.035);
    const logoBox = Math.round(canvas.width * 0.13);
    const badgePad = Math.round(logoBox * 0.14);
    const badgeSize = logoBox + badgePad * 2;
    const bx = pad;
    const by = canvas.height - pad - badgeSize;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = Math.round(canvas.width * 0.012);
    ctx.shadowOffsetY = Math.round(canvas.width * 0.004);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    roundRect(ctx, bx, by, badgeSize, badgeSize, Math.round(badgeSize * 0.22));
    ctx.fill();
    ctx.restore();

    // Contain the logo inside the badge (preserve aspect ratio).
    const maxW = logoBox;
    const maxH = logoBox;
    const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
    const dw = Math.round(logo.naturalWidth * scale);
    const dh = Math.round(logo.naturalHeight * scale);
    const lx = bx + badgePad + Math.round((maxW - dw) / 2);
    const ly = by + badgePad + Math.round((maxH - dh) / 2);
    ctx.drawImage(logo, lx, ly, dw, dh);

    return await canvasToFile(canvas, "ai-poster.png");
  } catch {
    // CORS / broken URL — ship the poster without a logo rather than fail.
    return posterFile;
  }
}
