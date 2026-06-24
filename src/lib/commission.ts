// Velte commission + Paystack gross-up. Reference implementation of the model
// described in docs/commission-fees.md.
//
// IMPORTANT: the *authoritative* fee is computed on the backend (a buyer must
// not be able to tamper with it). This client copy exists to render a live
// preview on open-amount links and as a fallback for display. The backend must
// implement the identical math and is the source of truth at charge time.

export interface ChargeBreakdown {
  /** X — the agreed product price. The seller receives this in full. */
  productPrice: number;
  /** C — Velte's flat commission for the band. Velte keeps this in full. */
  commission: number;
  /** F — Paystack's processing fee on the total. Covered by the buyer. */
  paystackFee: number;
  /** C + F — the single "Service fee" line shown to the buyer. */
  serviceFee: number;
  /** X + C + F — the amount actually charged to the buyer. */
  total: number;
}

// Paystack (Nigeria, local cards/transfer). Confirm against your live contract.
const PAYSTACK_RATE = 0.015;
const PAYSTACK_FLAT = 100;
const PAYSTACK_FLAT_WAIVER = 2500; // flat ₦100 is waived when total < this
const PAYSTACK_CAP = 2000; // Paystack fee never exceeds this

/**
 * Velte's flat commission for a given product price (NGN).
 * See docs/commission-fees.md §2.
 */
export function commissionForPrice(price: number): number {
  if (price <= 0) return 0;
  if (price < 10_000) return 300;
  if (price <= 20_000) return 500;
  if (price <= 50_000) return 700;
  if (price <= 100_000) return 1_000;
  if (price <= 500_000) return 2_000;
  if (price <= 1_000_000) return 4_000;
  return 5_000;
}

/**
 * Gross up the product price so that, after Paystack takes its cut, the seller
 * receives the full product price and Velte keeps its full commission — with
 * the buyer covering Paystack's fee. See docs/commission-fees.md §3.
 */
export function computeCharge(productPrice: number): ChargeBreakdown {
  const x = Math.max(0, Math.round(productPrice));
  const commission = commissionForPrice(x);

  // Standard regime: Paystack charges rate% + flat ₦100.
  let total = (x + commission + PAYSTACK_FLAT) / (1 - PAYSTACK_RATE);

  // If the resulting total is under the waiver threshold, Paystack drops the
  // flat ₦100 — re-solve without it.
  if (total < PAYSTACK_FLAT_WAIVER) {
    total = (x + commission) / (1 - PAYSTACK_RATE);
  }

  let paystackFee = total - x - commission;

  // If Paystack's fee would exceed its cap, the fee is fixed at the cap and the
  // total is simply price + commission + cap.
  if (paystackFee > PAYSTACK_CAP) {
    paystackFee = PAYSTACK_CAP;
    total = x + commission + PAYSTACK_CAP;
  }

  // Charge whole naira — round the total up so seller + commission stay whole.
  total = Math.ceil(total);
  paystackFee = total - x - commission;

  return {
    productPrice: x,
    commission,
    paystackFee,
    serviceFee: commission + paystackFee, // = total - x
    total,
  };
}
