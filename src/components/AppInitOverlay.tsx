"use client";

import Image from "next/image";
import { RefreshCw, WifiOff } from "lucide-react";

interface AppInitOverlayProps {
  status: "loading" | "error";
}

export default function AppInitOverlay({ status }: AppInitOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Soft brand glow behind the mark */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-100/60 blur-3xl" />

      <div className="relative flex flex-col items-center">
        {/* Logo: scales in, then breathes */}
        <div className="animate-[splash-pop_0.6s_cubic-bezier(0.22,1,0.36,1)]">
          <div className="animate-[splash-float_3s_ease-in-out_infinite]">
            <Image
              src="/velte_logo_esn5dj.png"
              alt="Velte"
              width={128}
              height={128}
              priority
              className="drop-shadow-sm"
            />
          </div>
        </div>

        {status === "loading" && (
          <div className="mt-9 h-1 w-36 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 animate-[splash-bar_1.1s_ease-in-out_infinite]" />
          </div>
        )}

        {status === "error" && (
          <div className="mt-9 flex max-w-xs flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <WifiOff className="h-5 w-5 text-red-500" />
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
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Wordmark pinned near the bottom — the classic app-launch signature */}
      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+2rem)] flex flex-col items-center gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
          Velte
        </p>
        <p className="text-[10px] text-gray-300">Your AI sales rep</p>
      </div>
    </div>
  );
}
