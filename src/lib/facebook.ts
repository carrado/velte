// lib/facebook.ts
// Thin wrapper around Meta's JS SDK for OAuth login and the WhatsApp
// Embedded Signup flow. Loads connect.facebook.net/sdk.js on demand.

declare global {
  interface Window {
    FB?: FacebookStatic;
    fbAsyncInit?: () => void;
  }
}

interface FacebookAuthResponse {
  code?: string;
  accessToken?: string;
  userID?: string;
  expiresIn?: number;
}

interface FacebookLoginResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse: FacebookAuthResponse | null;
}

interface FacebookLoginOptions {
  scope?: string;
  config_id?: string;
  response_type?: "code" | "token";
  override_default_response_type?: boolean;
  extras?: Record<string, unknown>;
}

interface FacebookStatic {
  init(options: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }): void;
  login(
    callback: (response: FacebookLoginResponse) => void,
    options?: FacebookLoginOptions,
  ): void;
}

const APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
const SDK_VERSION = process.env.NEXT_PUBLIC_FACEBOOK_API_VERSION || "v21.0";

let sdkPromise: Promise<void> | null = null;

export function loadFacebookSDK(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Facebook SDK can only load in the browser"),
    );
  }
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    if (!APP_ID) {
      reject(new Error("NEXT_PUBLIC_FACEBOOK_APP_ID is not configured"));
      return;
    }

    if (window.FB) {
      window.FB.init({
        appId: APP_ID,
        cookie: true,
        xfbml: false,
        version: SDK_VERSION,
      });
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      window.FB!.init({
        appId: APP_ID,
        cookie: true,
        xfbml: false,
        version: SDK_VERSION,
      });
      resolve();
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Failed to load the Facebook SDK"));
    };
    document.body.appendChild(script);
  });

  return sdkPromise;
}

// Launches Meta's WhatsApp Embedded Signup. The popup posts a `WA_EMBEDDED_SIGNUP`
// message back with the WABA + phone number IDs once the user finishes the flow.
export interface WhatsAppSignupResult {
  code: string;
  wabaId: string | null;
  phoneNumberId: string | null;
}

export async function launchWhatsAppEmbeddedSignup(): Promise<WhatsAppSignupResult> {
  await loadFacebookSDK();

  const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;

  if (!configId) {
    throw new Error("NEXT_PUBLIC_WHATSAPP_CONFIG_ID is not configured");
  }

  return new Promise<WhatsAppSignupResult>((resolve, reject) => {
    let authCode: string | null = null;
    let wabaId: string | null = null;
    let phoneNumberId: string | null = null;
    let completed = false;
    let cancelled = false; // ← add this
    let finishTimer: ReturnType<typeof setTimeout> | null = null; // ← and this

    const cleanup = () => {
      window.removeEventListener("message", messageHandler);
      if (finishTimer) clearTimeout(finishTimer); // ← cancel the timer too
    };

    const finish = () => {
      if (completed || cancelled) return; // ← guard against cancelled state
      if (!authCode) return;
      completed = true;
      cleanup();
      resolve({ code: authCode, wabaId, phoneNumberId });
    };

    const messageHandler = (event: MessageEvent) => {
      if (cancelled) return; // ← ignore messages after cancel
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      )
        return;

      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (payload?.type === "WA_EMBEDDED_SIGNUP") {
          const eventName = String(payload.event || "").toLowerCase();

          if (["finish", "finish_only_waba", "finished"].includes(eventName)) {
            wabaId = payload.data?.waba_id ?? null;
            phoneNumberId = payload.data?.phone_number_id ?? null;
            finish();
          }

          if (eventName === "cancel") {
            // ← handle Meta's own cancel event
            cancelled = true;
            cleanup();
            reject(new Error("WhatsApp signup was cancelled"));
          }
        }
      } catch {
        if (typeof event.data === "string") {
          const params = new URLSearchParams(event.data);
          const codeFromMessage = params.get("code");
          if (codeFromMessage) {
            authCode = codeFromMessage;
            finish();
          }
        }
      }
    };

    window.addEventListener("message", messageHandler);

    window.FB!.login(
      (response) => {
        if (response.status !== "connected") {
          cancelled = true; // ← set cancelled before cleanup
          cleanup();
          reject(new Error("WhatsApp signup was cancelled"));
          return;
        }

        authCode = response.authResponse?.accessToken ?? authCode;

        if (!authCode) {
          cancelled = true;
          cleanup();
          reject(new Error("No OAuth code was returned by Facebook"));
          return;
        }

        finishTimer = setTimeout(finish, 3000); // ← store the timer reference
      },
      {
        scope:
          "business_management,whatsapp_business_management,whatsapp_business_messaging,catalog_management",
        response_type: "token",
        override_default_response_type: true,
      },
    );
  });
}

export async function disconnectMeta() {
  if (window.FB) {
    (window.FB as any).logout(() => {});
  }
}
