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

export function buildWhatsappLink(
  whatsapp: string | null | undefined,
  message: string,
): string | null {
  if (!whatsapp) return null;
  const normalized = normalizeWhatsappNumber(whatsapp);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
