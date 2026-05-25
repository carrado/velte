"use client";

import Image from "next/image";
import { RefreshCw, WifiOff } from "lucide-react";

interface AppInitOverlayProps {
  status: "loading" | "error";
}

export default function AppInitOverlay({ status }: AppInitOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/velte_logo_esn5dj.png"
          alt="Velte"
          width={200}
          height={200}
          priority
          className={status === "loading" ? "animate-pulse" : ""}
        />

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 text-center max-w-xs">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
              <WifiOff className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                Connection problem
              </p>
              <p className="text-xs text-gray-500">
                We couldn&apos;t reach the server. Check your internet
                connection and try again.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
