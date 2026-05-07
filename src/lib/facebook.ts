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

    const cleanup = () => {
      window.removeEventListener("message", messageHandler);
    };

    const finish = () => {
      if (completed) return;

      if (!authCode) return;

      completed = true;
      cleanup();

      resolve({
        code: authCode,
        wabaId,
        phoneNumberId,
      });
    };

    const messageHandler = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }

      // Format 1: JSON payload from WhatsApp Embedded Signup
      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (payload?.type === "WA_EMBEDDED_SIGNUP") {
          const eventName = String(payload.event || "").toLowerCase();

          if (
            eventName === "finish" ||
            eventName === "finish_only_waba" ||
            eventName === "finished"
          ) {
            wabaId = payload.data?.waba_id ?? null;
            phoneNumberId = payload.data?.phone_number_id ?? null;

            finish();
          }
        }
      } catch {
        // Format 2: query-string payload from Facebook login callback
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
          cleanup();
          reject(new Error("WhatsApp signup was cancelled"));
          return;
        }

        authCode = response.authResponse?.accessToken ?? authCode;

        if (!authCode) {
          cleanup();
          reject(new Error("No OAuth code was returned by Facebook"));
          return;
        }

        /**
         * Do not reject immediately if WABA data is missing.
         * Sometimes Meta only returns the OAuth code on frontend.
         * Backend can use the code to fetch WABA + phone numbers.
         */
        setTimeout(() => {
          finish();
        }, 3000);
      },
      {
        scope:
          "business_management,whatsapp_business_management,whatsapp_business_messaging",
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
