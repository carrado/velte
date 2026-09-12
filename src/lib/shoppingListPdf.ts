import { jsPDF } from "jspdf";
import type { ShoppingListSnapshot } from "@/types/search";

// Shopping Lists — PDF export (spec §7). Client-side generation, on
// purpose: this app is deployed on Vercel (see CLAUDE.md's own note on the
// search route's maxDuration ceiling), which has no headless Chrome
// available by default, and a pure-JS library run in the browser sidesteps
// that entirely — no server round trip, no function-size/duration risk.
//
// Represents the SHOPPING LIST itself (spec §27), not search results —
// original request, items, quantities, notes, and the buyer's own budget
// (when they gave one). Per-item prices/fair ranges were pulled from the
// table on 2026-09-12 (same change as ShoppingListCard.tsx's on-screen
// table), and the summary's own estimated-total/over-budget/remaining
// figures followed on 2026-09-13 — both were derived from Velte's own
// price ESTIMATE, never something worth printing as if it were settled.
// Budget is different and stays: it's the buyer's own stated number, never
// a guess. If a completed job's SELECTED products ever need their own PDF
// later, that's a second, separate export (spec's own "may additionally
// contain the selected products" note), not a variant of this one.

const ORANGE = [234, 88, 12] as const; // orange-600, same reasoning
// CreditsDonut.tsx gives for using -600 over -500: better contrast on a
// white page than the usual brand orange-500.
const INK = [17, 24, 24] as const;
const GRAY = [107, 114, 128] as const;
const LIGHT_GRAY = [229, 231, 235] as const;

const MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// The real wordmark (2026-09-12) — same asset VelteLogo.tsx uses for its
// LIGHT-theme case (`velte_logo_esn5dj.png`: orange "V" + near-black
// "ELTE" baked into one flat PNG), the right one for a white PDF page.
// NOT velte_logo_dark.png — that's the near-black-recolored-to-white
// variant VelteLogo.tsx swaps to for a dark app background, which would
// print invisible white text on this page. Fetched at export time rather
// than bundled as a data URI so the asset stays a normal, cacheable public
// file instead of bloated inline base64 baked into the JS bundle.
const LOGO_PATH = "/velte_logo_esn5dj.png";
// The PNG's own pixel dimensions (977×481) — used to size it in the PDF
// without distorting it, since jsPDF's addImage takes an explicit w/h
// rather than reading the image's own aspect ratio.
const LOGO_ASPECT = 977 / 481;
const LOGO_WIDTH_MM = 32;
const LOGO_HEIGHT_MM = LOGO_WIDTH_MM / LOGO_ASPECT;

/** Fetches a same-origin public asset and returns it as a data URL jsPDF's
 *  addImage can consume. Never throws — a failed fetch/decode just means
 *  the header falls back to the plain-text wordmark it always had, so a
 *  buyer never gets a broken/blank PDF over a missing logo file. */
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_PATH);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function naira(value: number): string {
  return `NGN ${value.toLocaleString("en-NG")}`;
}

/** Column widths across the item table, summing to CONTENT_WIDTH. No price
 *  columns (2026-09-12, explicit request — Item/Qty/Notes only), so Item
 *  and Notes get the extra room that freed up rather than leaving it blank. */
const COLS = {
  item: 90,
  qty: 15,
  notes: CONTENT_WIDTH - 90 - 15, // 75
};

function drawHeader(
  doc: jsPDF,
  list: ShoppingListSnapshot,
  logoDataUrl: string | null,
) {
  let hasLogo = false;
  if (logoDataUrl) {
    try {
      doc.addImage(
        logoDataUrl,
        "PNG",
        MARGIN,
        8,
        LOGO_WIDTH_MM,
        LOGO_HEIGHT_MM,
      );
      hasLogo = true;
    } catch {
      // Malformed/undecodable image data — fall through to the text
      // wordmark below rather than a broken or half-rendered page.
      hasLogo = false;
    }
  }
  if (!hasLogo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...ORANGE);
    doc.text("Velte", MARGIN, 20);
  }

  const subtitleY = hasLogo ? 8 + LOGO_HEIGHT_MM + 4 : 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text("Shopping List", MARGIN, subtitleY);

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(dateStr, PAGE_WIDTH - MARGIN, hasLogo ? 14 : 20, { align: "right" });

  const dividerY = subtitleY + 4;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.line(MARGIN, dividerY, PAGE_WIDTH - MARGIN, dividerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  const titleY = dividerY + 10;
  const titleLines = doc.splitTextToSize(list.goalText, CONTENT_WIDTH);
  doc.text(titleLines, MARGIN, titleY);
  return titleY + titleLines.length * 6;
}

function drawSummary(
  doc: jsPDF,
  list: ShoppingListSnapshot,
  y: number,
): number {
  // No estimated total or over/remaining difference (2026-09-13, explicit
  // request) — both were derived from Velte's own per-item ESTIMATE, which
  // no longer shows anywhere else on this page (see COLS's own comment on
  // the table dropping its price columns). Budget is different: it's the
  // BUYER'S OWN stated figure, never a guess, so it stays — shown only
  // when they actually gave one.
  const rows: [string, string][] = [];
  if (list.budgetNaira != null) {
    rows.push(["Budget", naira(list.budgetNaira)]);
  }
  rows.push([
    "Items",
    `${list.items.length} across ${list.categoryCount} categor${list.categoryCount === 1 ? "y" : "ies"}`,
  ]);

  doc.setFontSize(10);
  let rowY = y + 4;
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(label, MARGIN, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(value, MARGIN + 45, rowY);
    rowY += 6;
  }
  return rowY + 4;
}

function drawTableHeader(doc: jsPDF, y: number): number {
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  let x = MARGIN + 2;
  doc.text("Item", x, y + 5.5);
  x += COLS.item;
  doc.text("Qty", x, y + 5.5);
  x += COLS.qty;
  doc.text("Notes", x, y + 5.5);
  return y + 8;
}

function drawCategoryRow(doc: jsPDF, category: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(category.toUpperCase(), MARGIN + 2, y + 5);
  return y + 6;
}

export async function downloadShoppingListPdf(
  list: ShoppingListSnapshot,
): Promise<void> {
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = drawHeader(doc, list, logoDataUrl);
  y = drawSummary(doc, list, y);
  y = drawTableHeader(doc, y);

  const grouped = new Map<string, typeof list.items>();
  for (const item of list.items) {
    const bucket = grouped.get(item.category) ?? [];
    bucket.push(item);
    grouped.set(item.category, bucket);
  }

  const ensureRoom = (needed: number) => {
    if (y + needed <= PAGE_HEIGHT - MARGIN) return;
    doc.addPage();
    y = MARGIN;
    y = drawTableHeader(doc, y);
  };

  for (const [category, items] of grouped) {
    ensureRoom(10);
    y = drawCategoryRow(doc, category, y);

    for (const item of items) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const notesLines = item.notes
        ? doc.splitTextToSize(item.notes, COLS.notes - 2)
        : [""];
      const itemLines = doc.splitTextToSize(item.label, COLS.item - 2);
      const rowLines = Math.max(itemLines.length, notesLines.length);
      const rowHeight = rowLines * 4.5 + 2;
      ensureRoom(rowHeight);

      let x = MARGIN + 2;
      doc.setTextColor(...INK);
      doc.text(itemLines, x, y + 4);
      x += COLS.item;
      doc.setTextColor(...GRAY);
      doc.text(String(item.quantity), x, y + 4);
      x += COLS.qty;
      doc.text(notesLines, x, y + 4);

      y += rowHeight;
      doc.setDrawColor(...LIGHT_GRAY);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `Velte · Page ${i} of ${pageCount}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 8,
      { align: "center" },
    );
  }

  const fileSafeName = list.goalText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  doc.save(`velte-shopping-list-${fileSafeName || "list"}.pdf`);
}
