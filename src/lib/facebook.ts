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

// ── Storage keys ──────────────────────────────────────────────────────────────
const OAUTH_RETURN_KEY = "velte:fb-oauth-return";
const OAUTH_RESULT_KEY = "velte:fb-oauth-result";

// ── Device detection ──────────────────────────────────────────────────────────

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

// ── SDK Loader ────────────────────────────────────────────────────────────────

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
        cookie: false,
        xfbml: false,
        version: SDK_VERSION,
      });
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      window.FB!.init({
        appId: APP_ID,
        cookie: false,
        xfbml: false,
        version: SDK_VERSION,
      });
      resolve();
    };

    if (!document.getElementById("facebook-jssdk")) {
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
    }
  });

  return sdkPromise;
}

// ── Mobile redirect ───────────────────────────────────────────────────────────
//
// On mobile, FB.login() popup is blocked by the browser. We do a full-page
// redirect to Facebook OAuth instead — the Facebook app opens via universal
// links if installed, otherwise falls back to mobile browser.
//
// response_type=token → Facebook redirects back to:
//   /auth/facebook/callback#access_token=xxx&expires_in=xxx
//
// The hash fragment (#access_token) is what the callback page reads.
// This matches what the backend expects: { accessToken } not { code }.
//
// ⚠️  Register in Meta App Dashboard:
//     Facebook Login → Settings → Valid OAuth Redirect URIs
//     Add: https://yourdomain.com/auth/facebook/callback
//     Add: http://localhost:4001/auth/facebook/callback  (dev)

function redirectToFacebookMobileSignup(
  configId: string,
  returnPath: string,
): void {
  if (!APP_ID) throw new Error("NEXT_PUBLIC_FACEBOOK_APP_ID is not configured");

  // Store the EXACT path to return to, e.g. /abc123/ai-setup
  // This is what the callback page will router.replace() to
  sessionStorage.setItem(OAUTH_RETURN_KEY, returnPath);

  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: `${window.location.origin}/auth/facebook/callback`,
    response_type: "code", // ← token not code — backend needs accessToken
    config_id: configId,
    scope:
      "business_management,whatsapp_business_management,whatsapp_business_messaging",
    display: "touch",
  });

  // replace() prevents opening a new tab and keeps back-navigation clean
  window.location.replace(
    `https://www.facebook.com/${SDK_VERSION}/dialog/oauth?${params.toString()}`,
  );
}

// ── Consume pending OAuth result ──────────────────────────────────────────────
// After the callback page reads the accessToken from the URL hash and stores
// it in sessionStorage, AISetupPage calls this on mount to pick it up.

export interface PendingOAuthResult {
  accessToken?: string;
  code?: string;
}

export function consumePendingOAuthResult(): PendingOAuthResult | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(OAUTH_RESULT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(OAUTH_RESULT_KEY);

  try {
    const parsed = JSON.parse(raw) as { accessToken?: string; code?: string };
    if (!parsed.accessToken && !parsed.code) return null;
    return { accessToken: parsed.accessToken, code: parsed.code };
  } catch {
    return null;
  }
}

// ── WhatsApp Embedded Signup ──────────────────────────────────────────────────

export interface WhatsAppSignupResult {
  accessToken: string;
  wabaId: string | null;
  phoneNumberId: string | null;
}

/**
 * Launch Meta's WhatsApp Embedded Signup.
 *
 * Desktop → FB SDK popup → resolves with { accessToken, wabaId, phoneNumberId }
 * Mobile  → full-page redirect to Facebook (opens FB app if installed)
 *           → Facebook redirects to /auth/facebook/callback#access_token=xxx
 *           → callback page stores token + redirects to returnPath (/{userId}/ai-setup)
 *           → AISetupPage reads token via consumePendingOAuthResult() on mount
 *           → calls configureWABA(accessToken) to complete setup
 *
 * @param returnPath  Full path to return to after mobile OAuth.
 *                    Pass `/${userId}/ai-setup` so the callback returns here.
 */
export async function launchWhatsAppEmbeddedSignup(
  returnPath?: string,
): Promise<WhatsAppSignupResult> {
  const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;
  if (!configId)
    throw new Error("NEXT_PUBLIC_WHATSAPP_CONFIG_ID is not configured");

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobileDevice()) {
    const path =
      returnPath || `${window.location.pathname}${window.location.search}`;
    redirectToFacebookMobileSignup(configId, path);
    return new Promise<WhatsAppSignupResult>(() => {}); // page navigates away
  }

  // ── Desktop: FB SDK popup ─────────────────────────────────────────────────
  await loadFacebookSDK();

  return new Promise<WhatsAppSignupResult>((resolve, reject) => {
    let accessToken: string | null = null;
    let wabaId: string | null = null;
    let phoneNumberId: string | null = null;
    let completed = false;

    const cleanup = () => window.removeEventListener("message", messageHandler);

    const finish = () => {
      if (completed || !accessToken) return;
      completed = true;
      cleanup();
      resolve({ accessToken, wabaId, phoneNumberId });
    };

    const messageHandler = (event: MessageEvent) => {
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
            cleanup();
            reject(new Error("WhatsApp signup was cancelled"));
          }
        }
      } catch {
        if (typeof event.data === "string") {
          const p = new URLSearchParams(event.data);
          const t = p.get("access_token");
          if (t) {
            accessToken = t;
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
        accessToken = response.authResponse?.code ?? null;
        if (!accessToken) {
          cleanup();
          reject(new Error("No code was returned by Facebook"));
          return;
        }
        setTimeout(finish, 3000);
      },
      {
        config_id: configId,
        scope:
          "business_management,whatsapp_business_management,whatsapp_business_messaging",
        response_type: "code",
        override_default_response_type: true,
      },
    );
  });
}

// ── Disconnect ────────────────────────────────────────────────────────────────

export async function disconnectMeta(): Promise<void> {
  if (typeof window !== "undefined" && window.FB) {
    window.FB.logout(() => {});
  }
}
