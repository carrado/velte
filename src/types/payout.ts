/** A bank Paystack can pay out to, for the vendor's bank picker. */
export interface PayoutBank {
  name: string;
  code: string;
  slug: string;
}

/** The vendor's settlement destination, as the dashboard sees it.
 *
 *  Velte holds a buyer's payment and releases it to the vendor once the order
 *  is confirmed, so this is where a TRANSFER goes — not a subaccount that
 *  would be paid at the moment the card clears. A vendor without one cannot
 *  sell through cart checkout.
 *
 *  The full account number never leaves the backend once stored; the vendor
 *  already knows it, and nothing in the dashboard needs a second copy.
 *  `accountName` came from the bank via Paystack, not from the vendor. */
export interface PayoutAccount {
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountName: string;
  verifiedAt: string | null;
}

export interface SavePayoutAccountPayload {
  bankCode: string;
  accountNumber: string;
}

/** The name-only preview shown before an account is saved, so a vendor
 *  confirms what the bank says rather than trusting their own typing. */
export interface ResolvedAccount {
  accountName: string;
}
