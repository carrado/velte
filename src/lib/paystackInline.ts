// Client-side helper for Paystack Inline Popup (v2)
// Loads https://js.paystack.co/v2/inline.js on demand and resumes server-initialized transactions.

declare global {
  interface Window {
    PaystackPop?: new () => {
      newTransaction: (options: Record<string, unknown>) => void;
      resumeTransaction: (
        accessCode: string,
        options?: {
          onSuccess?: (transaction: { reference: string }) => void;
          onCancel?: () => void;
          onError?: (error: Error) => void;
          onLoad?: () => void;
        },
      ) => void;
    };
  }
}

let scriptLoadingPromise: Promise<boolean> | null = null;

export function loadPaystackInline(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.PaystackPop) return Promise.resolve(true);

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    const existing = document.getElementById("paystack-inline-v2");
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "paystack-inline-v2";
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptLoadingPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

export interface PaystackInlineOptions {
  accessCode: string;
  authorizationUrl?: string;
  onSuccess?: (transaction: { reference: string }) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Opens Paystack inline popup using an access code from a server-initialized transaction.
 * Falls back to redirecting to authorizationUrl if the script failed to load (e.g. adblocker).
 */
export async function openPaystackInline({
  accessCode,
  authorizationUrl,
  onSuccess,
  onCancel,
  onError,
}: PaystackInlineOptions): Promise<void> {
  const loaded = await loadPaystackInline();

  if (loaded && window.PaystackPop) {
    try {
      const popup = new window.PaystackPop();
      popup.resumeTransaction(accessCode, {
        onSuccess,
        onCancel,
        onError,
      });
      return;
    } catch (err) {
      console.warn(
        "Paystack inline resumeTransaction failed, falling back:",
        err,
      );
    }
  }

  // Fallback to hosted redirect if inline popup cannot be opened
  if (authorizationUrl) {
    window.location.assign(authorizationUrl);
    return;
  }

  onError?.(new Error("Couldn't load Paystack payment modal."));
}
