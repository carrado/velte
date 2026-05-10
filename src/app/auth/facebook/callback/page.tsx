"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertCircle } from "lucide-react";

const OAUTH_RETURN_KEY = "velte:fb-oauth-return";
const OAUTH_RESULT_KEY = "velte:fb-oauth-result";

// ── Loading UI (reused by Suspense fallback) ──────────────────────────────────

function LoadingCard() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
      <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <RefreshCw
          size={22}
          className="text-orange-400 animate-spin mx-auto mb-3"
        />
        <h1 className="text-[15px] font-bold text-gray-900 mb-1">
          Finishing WhatsApp setup
        </h1>
        <p className="text-sm text-gray-500">
          Please wait while we complete your connection…
        </p>
      </div>
    </div>
  );
}

// ── Inner component ───────────────────────────────────────────────────────────
// Does NOT use useSearchParams — reads from window.location.hash directly.
// Facebook returns response_type=token as a hash fragment (#access_token=xxx)
// not as a query param, so useSearchParams wouldn't see it anyway.

function FacebookCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Facebook returns errors as query params and token as hash fragment:
    //
    //   Error:   /callback?error=access_denied&error_description=...
    //   Success: /callback#access_token=xxx&expires_in=5183944&...
    //
    // We check query params for errors first, then hash for the token.

    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    // Read token from hash fragment
    const hash = window.location.hash.substring(1); // strip leading #
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");

    if (!accessToken) {
      setError("No access token returned by Facebook. Please try again.");
      return;
    }

    // Store the token so AISetupPage can pick it up via consumePendingOAuthResult()
    sessionStorage.setItem(OAUTH_RESULT_KEY, JSON.stringify({ accessToken }));

    // Return to /{userId}/ai-setup (or wherever the setup page stored)
    // Falls back to "/" only as a last resort — in practice the return key
    // should always be set because redirectToFacebookMobileSignup() sets it
    const returnPath = sessionStorage.getItem(OAUTH_RETURN_KEY) || "/";
    sessionStorage.removeItem(OAUTH_RETURN_KEY);

    // Replace so the callback URL isn't in the browser history
    router.replace(returnPath);
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
        <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl p-6 text-center">
          <div className="w-11 h-11 mx-auto bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <h1 className="text-[15px] font-bold text-gray-900 mb-1">
            WhatsApp setup failed
          </h1>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="text-sm font-semibold text-orange-500 hover:text-orange-600 cursor-pointer"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  return <LoadingCard />;
}

// ── Page export ───────────────────────────────────────────────────────────────
// Wrapping in Suspense is required by Next.js App Router for any component
// that reads from the URL — prevents prerender errors at build time.

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <FacebookCallback />
    </Suspense>
  );
}
