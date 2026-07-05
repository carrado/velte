import type { CategoryProduct } from "@/types/product";

export interface PriceBreakdown {
  /** Single price, or the low end of a range. */
  price: number;
  /** High end of a range, or null for a single price. */
  priceMax: number | null;
  /** True when the listing is a range (`priceMax` above `price`). */
  isRange: boolean;
  /** Service with no upfront price — show "Contact for quote". */
  quoteOnRequest: boolean;
  currencySymbol: string;
}

export function computePrice(product: CategoryProduct): PriceBreakdown {
  const currencySymbol = product.currency === "USD" ? "$" : "₦";
  const priceMax = product.priceMax ?? null;
  return {
    price: product.price,
    priceMax,
    isRange: priceMax != null && priceMax > product.price,
    quoteOnRequest: product.quoteOnRequest === true,
    currencySymbol,
  };
}

export function fmt(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
