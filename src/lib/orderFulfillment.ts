export interface OrderFulfillmentInput {
  name: string;
  phone: string;
  address: string;
}

const NG_MOBILE = /^234[789]\d{9}$/;

export function normalizeNgMobile(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("234")) {
    // already international
  } else if (n.startsWith("0")) {
    n = `234${n.slice(1)}`;
  } else if (n.length === 10) {
    n = `234${n}`;
  } else {
    return null;
  }
  return NG_MOBILE.test(n) ? n : null;
}

export function displayNgPhone(raw: string): string {
  const normalized = normalizeNgMobile(raw);
  if (!normalized) return raw;
  return `0${normalized.slice(3)}`;
}

export function fulfillmentReady(input: OrderFulfillmentInput): boolean {
  const name = input.name.trim();
  const address = input.address.trim();
  return (
    name.length >= 2 &&
    name.length <= 80 &&
    address.length >= 8 &&
    address.length <= 300 &&
    Boolean(normalizeNgMobile(input.phone))
  );
}
