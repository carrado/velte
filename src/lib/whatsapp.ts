// wa.me requires digits-only international format (country code included,
// no leading "+", no leading "0"). Numbers in the DB are inconsistently
// stored — some already international ("+234801...", "234801..."), some
// local ("0801...") — so every wa.me link must normalize at build time
// rather than trust the stored value, or a vendor whose number lacks "234"
// gets a broken link ("phone number shared via url is invalid" in WhatsApp).
export function normalizeWhatsappNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  // No leading 0 and no country code — a bare local number (10 digits for
  // Nigeria) entered without its leading 0.
  if (digits.length === 10) return `234${digits}`;
  return digits;
}

// wa.me's pre-fill can only carry text — there's no attachment param, so an
// image can't be sent along with the message itself. `productId` (pass it
// only when the listing actually has a mainImageUrl — see call sites) adds
// a short, branded /s/p/<id> link instead of pasting a long raw Cloudinary
// URL into the chat; WhatsApp auto-previews it as a thumbnail once the
// message lands, which is as close to "sent with the photo" as a wa.me link
// can get. See src/app/s/p/[id]/route.ts for the redirect itself.
const SITE_URL = "https://velte.ng";

export function buildWhatsappLink(
  whatsapp: string | null | undefined,
  message: string,
  productId?: string,
): string | null {
  if (!whatsapp) return null;
  const normalized = normalizeWhatsappNumber(whatsapp);
  if (!normalized) return null;
  const fullMessage = productId
    ? `${message}\n\nPhoto: ${SITE_URL}/s/p/${productId}`
    : message;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(fullMessage)}`;
}
