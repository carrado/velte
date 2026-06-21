// Types for the Invoice & Receipt settings (Settings → Invoice & Receipt tab)
// and its service. The business *logo* is intentionally NOT stored here — it is
// the account profile photo (`user.avatar`), shared across the app, and is read
// from the user record when rendering documents.

export interface InvoiceDocBusiness {
  name: string;
  address: string;
  phone: string;
  email: string;
  /** Tax ID / RC number (invoice only; receipts omit it in the UI) */
  taxId: string;
  website: string;
}

export interface InvoiceSettings {
  business: InvoiceDocBusiness;
  footerNote: string;
  /** Hex brand colour, e.g. "#f97316" */
  primaryColor: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  /** Days until payment is due, used to compute the invoice due date */
  dueDays: number;
}

export interface ReceiptSettings {
  business: InvoiceDocBusiness;
  thankYouMessage: string;
  returnPolicy: string;
  primaryColor: string;
  showBarcode: boolean;
}

export interface InvoiceReceiptSettings {
  invoice: InvoiceSettings;
  receipt: ReceiptSettings;
}
