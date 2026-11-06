/** Paint the vendor logo and store name onto an AI poster before Cloudinary upload.
 *  Creates an agency-grade verified brand capsule in the lower corner of the poster.
 *  Returns the original poster file unchanged if canvas processing fails — generation must never break. */

function loadImage(src: string, anonymous = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (anonymous) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load image"));
    img.src = src;
  });
}

async function safeLoadLogo(url: string): Promise<HTMLImageElement | null> {
  try {
    return await loadImage(url, true);
  } catch {
    return null;
  }
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

function drawVerifiedBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.save();
  // Velte verified pill circle
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ea580c";
  ctx.fill();

  // White vector checkmark
  ctx.beginPath();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.8, size * 0.16);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const r = size * 0.26;
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx - r * 0.25, cy + r * 0.72);
  ctx.lineTo(cx + r * 1.05, cy - r * 0.65);
  ctx.stroke();
  ctx.restore();
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
      0.95,
    );
  });
}

/**
 * Overlay vendor logo and store name in the bottom-left of an AI poster.
 * Renders a crisp, high-converting commercial brand capsule (logo mark + store name + verified badge).
 */
export async function overlayStoreLogoOnPoster(
  posterBase64: string,
  mimeType: string,
  logoUrl?: string | null,
  storeName?: string | null,
): Promise<File> {
  const posterFile = (() => {
    const binary = atob(posterBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], "ai-poster.png", {
      type: mimeType || "image/png",
    });
  })();

  const cleanName = (storeName || "").trim();
  const url = logoUrl?.trim() || null;

  // If neither store name nor logo is available, return raw poster
  if (!cleanName && !url) return posterFile;

  try {
    const poster = await loadImage(
      `data:${mimeType || "image/png"};base64,${posterBase64}`,
    );

    const canvas = document.createElement("canvas");
    canvas.width = poster.naturalWidth || poster.width || 1024;
    canvas.height = poster.naturalHeight || poster.height || 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return posterFile;

    // Draw the base generated poster
    ctx.drawImage(poster, 0, 0, canvas.width, canvas.height);

    // Attempt to load the vendor logo
    const logoImg = url ? await safeLoadLogo(url) : null;

    const W = canvas.width;
    const H = canvas.height;

    // Proportional sizing based on canvas resolution (optimized for 1024x1024)
    const marginX = Math.round(W * 0.04);
    const marginY = Math.round(H * 0.04);
    const badgeH = Math.round(H * 0.088); // ~90px on 1024
    const cornerRadius = Math.round(badgeH / 2); // Stadium pill

    const padLeft = Math.round(badgeH * 0.14);
    const avatarSize = Math.round(badgeH * 0.72); // ~65px avatar circle
    const avatarRadius = Math.round(avatarSize / 2);
    const gapAvatarText = Math.round(badgeH * 0.16);
    const fontSize = Math.round(badgeH * 0.36); // ~32px typography
    const checkBadgeSize = Math.round(fontSize * 0.75); // ~24px verified mark
    const gapTextCheck = Math.round(badgeH * 0.12);
    const padRight = Math.round(badgeH * 0.28);

    // Measure and constrain store name text
    ctx.font = `700 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const maxTextW = W * 0.48; // Max 48% of poster width
    let displayText = cleanName || "Official Store";
    while (
      displayText.length > 3 &&
      ctx.measureText(displayText + "…").width > maxTextW
    ) {
      displayText = displayText.slice(0, -1);
    }
    if (displayText !== cleanName && cleanName) {
      displayText = displayText.trim() + "…";
    }
    const textW = ctx.measureText(displayText).width;

    // Total width of the brand capsule
    const badgeW =
      padLeft +
      avatarSize +
      gapAvatarText +
      textW +
      gapTextCheck +
      checkBadgeSize +
      padRight;

    const bx = marginX;
    const by = H - marginY - badgeH;

    // 1. Draw capsule shadow and backdrop
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
    ctx.shadowBlur = Math.round(W * 0.022);
    ctx.shadowOffsetY = Math.round(H * 0.007);
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    roundRect(ctx, bx, by, badgeW, badgeH, cornerRadius);
    ctx.fill();
    ctx.restore();

    // 2. Draw subtle border around capsule
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = Math.max(1, Math.round(W * 0.0015));
    roundRect(ctx, bx, by, badgeW, badgeH, cornerRadius);
    ctx.stroke();
    ctx.restore();

    // 3. Draw Logo Avatar (or branded initial circle if no logo)
    const ax = bx + padLeft;
    const ay = by + Math.round((badgeH - avatarSize) / 2);

    if (logoImg) {
      // Circular clip for logo
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        ax + avatarRadius,
        ay + avatarRadius,
        avatarRadius,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.clip();

      // Fit image into circle
      const scale = Math.min(
        avatarSize / logoImg.naturalWidth,
        avatarSize / logoImg.naturalHeight,
      );
      const dw = Math.round(logoImg.naturalWidth * scale);
      const dh = Math.round(logoImg.naturalHeight * scale);
      const ix = ax + Math.round((avatarSize - dw) / 2);
      const iy = ay + Math.round((avatarSize - dh) / 2);
      ctx.drawImage(logoImg, ix, iy, dw, dh);
      ctx.restore();

      // Outer ring on avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        ax + avatarRadius,
        ay + avatarRadius,
        avatarRadius,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
      ctx.lineWidth = Math.max(1, Math.round(W * 0.0012));
      ctx.stroke();
      ctx.restore();
    } else {
      // Branded Velte gradient circle with store initial
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        ax + avatarRadius,
        ay + avatarRadius,
        avatarRadius,
        0,
        Math.PI * 2,
      );
      const grad = ctx.createLinearGradient(
        ax,
        ay,
        ax + avatarSize,
        ay + avatarSize,
      );
      grad.addColorStop(0, "#ff6b00");
      grad.addColorStop(1, "#ea580c");
      ctx.fillStyle = grad;
      ctx.fill();

      const initial = (cleanName.charAt(0) || "V").toUpperCase();
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.round(avatarSize * 0.52)}px Inter, system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        initial,
        ax + avatarRadius,
        ay + avatarRadius + Math.round(avatarSize * 0.02),
      );
      ctx.restore();
    }

    // 4. Draw Store Name
    const tx = ax + avatarSize + gapAvatarText;
    const ty = by + Math.round(badgeH / 2);

    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.font = `700 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(displayText, tx, ty);
    ctx.restore();

    // 5. Draw Verified Checkmark Badge
    const checkX = tx + textW + gapTextCheck + Math.round(checkBadgeSize / 2);
    const checkY = ty;
    drawVerifiedBadge(ctx, checkX, checkY, checkBadgeSize);

    return await canvasToFile(canvas, "ai-poster.png");
  } catch {
    // If canvas manipulation fails, preserve the original poster image
    return posterFile;
  }
}
