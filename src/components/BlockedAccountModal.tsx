"use client";

import { createPortal } from "react-dom";
import { ShieldAlert } from "lucide-react";
import { useBlockedStore } from "@/store/blockedStore";
import { useUserStore } from "@/store/userStore";

// Mounted once at the root layout — reads its own state, so no page needs to
// wire this up. Fires whenever api-client.ts's request() sees a 423 from
// ANY authenticated call (login rejection, or an already-logged-in vendor
// blocked mid-session), always with the same admin-typed message.
export default function BlockedAccountModal() {
  const message = useBlockedStore((s) => s.message);
  if (!message) return null;

  function acknowledge() {
    useUserStore.getState().clearUser();
    useBlockedStore.getState().clear();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/auth")
    ) {
      window.location.replace("/auth/login");
    }
  }

  return createPortal(
    // z-[10000]: must sit above AppInitOverlay (z-[9999]) — a blocked
    // response can arrive while that overlay is still showing (loading, or
    // its own error state from the same failed request), and the blocked
    // message has to win regardless of what's stuck underneath it.
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </div>
          <h3 className="text-dash-heading font-semibold text-[#111827]">
            Account blocked
          </h3>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>

        <div className="flex justify-center px-6 py-4 border-t border-[#E5E7EB] bg-gray-50">
          <button
            onClick={acknowledge}
            className="px-4 py-2 text-dash-body font-medium cursor-pointer text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
