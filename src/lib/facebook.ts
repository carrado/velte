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
  logout(callback: () => void): void;
}

const APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
const SDK_VERSION = process.env.NEXT_PUBLIC_FACEBOOK_API_VERSION || "v21.0";

const OAUTH_RETURN_KEY = "velte:fb-oauth-return";
const OAUTH_RESULT_KEY = "velte:fb-oauth-result";

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
}

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

// On mobile, the popup-based FB.login flow is unreliable. Instead we full-page
// redirect to Facebook's OAuth dialog — when the Facebook app is installed,
// iOS universal links / Android app links route the user into the app to
// complete the WhatsApp Business signup. Otherwise it falls back to the mobile
// web flow. The callback at /auth/facebook/callback persists the auth code to
// sessionStorage and redirects back to the originating page.
function redirectToFacebookMobileSignup(configId: string): void {
  if (!APP_ID) {
    throw new Error("NEXT_PUBLIC_FACEBOOK_APP_ID is not configured");
  }

  const redirectUri = `${window.location.origin}/auth/facebook/callback`;
  const state = Math.random().toString(36).slice(2);

  sessionStorage.setItem(
    OAUTH_RETURN_KEY,
    `${window.location.pathname}${window.location.search}`,
  );

  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    config_id: configId,
    scope:
      "business_management,whatsapp_business_management,whatsapp_business_messaging",
    display: "touch",
    state,
  });

  window.location.href = `https://www.facebook.com/${SDK_VERSION}/dialog/oauth?${params.toString()}`;
}

// Reads any auth code that the /auth/facebook/callback route stashed in
// sessionStorage when the user returned from a mobile redirect flow.
export function consumePendingOAuthResult(): WhatsAppSignupResult | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(OAUTH_RESULT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(OAUTH_RESULT_KEY);

  try {
    const parsed = JSON.parse(raw) as {
      code?: string;
      wabaId?: string | null;
      phoneNumberId?: string | null;
    };
    if (!parsed.code) return null;
    return {
      code: parsed.code,
      wabaId: parsed.wabaId ?? null,
      phoneNumberId: parsed.phoneNumberId ?? null,
    };
  } catch {
    return null;
  }
}

export async function launchWhatsAppEmbeddedSignup(): Promise<WhatsAppSignupResult> {
  const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;

  if (!configId) {
    throw new Error("NEXT_PUBLIC_WHATSAPP_CONFIG_ID is not configured");
  }

  if (isMobileDevice()) {
    redirectToFacebookMobileSignup(configId);
    // Page is navigating away — never resolve so the caller doesn't flash
    // a transient error/success state during the unload.
    return new Promise<WhatsAppSignupResult>(() => {});
  }

  await loadFacebookSDK();

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
    window.FB.logout(() => {});
  }
}
