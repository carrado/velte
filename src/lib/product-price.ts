import type { CategoryProduct } from "@/types/product";

export interface PriceBreakdown {
  finalPrice: number;
  basePrice: number;
  effectivePrice: number;
  discountAmount: number | null;
  taxAmount: number;
  isNegotiable: boolean;
  minFinalPrice: number | null;
  hasDiscount: boolean;
  hasTax: boolean;
  currencySymbol: string;
}

export function computePrice(product: CategoryProduct): PriceBreakdown {
  const currencySymbol = product.currency === "USD" ? "$" : "₦";
  const base = product.price;

  const hasDiscount =
    product.discountedPrice != null && product.discountedPrice < base;
  const effectivePrice = hasDiscount ? product.discountedPrice! : base;
  const discountAmount = hasDiscount ? base - product.discountedPrice! : null;

  const hasTax =
    product.taxIncluded === true &&
    product.taxValue != null &&
    product.taxValue > 0;

  let taxAmount = 0;
  if (hasTax) {
    taxAmount =
      product.taxType === "percentage"
        ? (effectivePrice * product.taxValue!) / 100
        : product.taxValue!;
  }

  const finalPrice = effectivePrice + taxAmount;

  const isNegotiable =
    product.isNegotiable === true && product.minimumPrice != null;

  let minFinalPrice: number | null = null;
  if (isNegotiable && product.minimumPrice != null) {
    const minTax = hasTax
      ? product.taxType === "percentage"
        ? (product.minimumPrice * product.taxValue!) / 100
        : product.taxValue!
      : 0;
    minFinalPrice = product.minimumPrice + minTax;
  }

  return {
    finalPrice,
    basePrice: base,
    effectivePrice,
    discountAmount,
    taxAmount,
    isNegotiable,
    minFinalPrice,
    hasDiscount,
    hasTax,
    currencySymbol,
  };
}

export function fmt(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
