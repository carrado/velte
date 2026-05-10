"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, AlertCircle } from "lucide-react";

const OAUTH_RETURN_KEY = "velte:fb-oauth-return";
const OAUTH_RESULT_KEY = "velte:fb-oauth-result";

export default function FacebookCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const errorParam = params.get("error");
  const errorDescription = params.get("error_description");
  const [error] = useState<string | null>(() => {
    if (errorParam) return errorDescription || errorParam;
    if (!code) return "No authorization code returned by Facebook";
    return null;
  });

  useEffect(() => {
    if (error || !code) return;

    const returnPath = sessionStorage.getItem(OAUTH_RETURN_KEY) || "/";
    sessionStorage.removeItem(OAUTH_RETURN_KEY);

    sessionStorage.setItem(
      OAUTH_RESULT_KEY,
      JSON.stringify({ code, wabaId: null, phoneNumberId: null }),
    );

    router.replace(returnPath);
  }, [code, error, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
      <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl p-6 text-center">
        {error ? (
          <>
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
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
