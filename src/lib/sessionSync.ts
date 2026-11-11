import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";
import type { User } from "@/types/user";
import type { Buyer } from "@/types/buyer";

// Global in-memory cache flag: once session resolution has completed in this browser
// session (tab), navigating between pages will never trigger duplicate /api/auth/session requests.
let sessionSettled = false;
let inFlightPromise: Promise<void> | null = null;

export function isSessionSettled(): boolean {
  // If either store already has an authed user/buyer loaded in state, it's settled
  if (useUserStore.getState().user || useBuyerStore.getState().buyer) {
    sessionSettled = true;
  }
  return sessionSettled;
}

export function resetSessionSync(): void {
  sessionSettled = false;
  inFlightPromise = null;
}

export function markSessionSettled(): void {
  sessionSettled = true;
}

/**
 * Hydrates both vendor and buyer sessions once per browser session.
 * Subsequent calls across page navigations immediately return without hitting the network.
 */
export async function syncSession(options?: {
  force?: boolean;
}): Promise<void> {
  if (isSessionSettled() && !options?.force) {
    return;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "same-origin",
      });

      if (res.status === 401) {
        sessionSettled = true;
        useUserStore.getState().clearUser();
        useBuyerStore.getState().clearBuyer();
        return;
      }

      if (!res.ok) throw new Error(`session check ${res.status}`);

      const data = (await res.json()) as {
        vendor: User | null;
        buyer: Buyer | null;
      };

      sessionSettled = true;
      if (data.vendor) useUserStore.getState().setUser(data.vendor);
      if (data.buyer) useBuyerStore.getState().setBuyer(data.buyer);
    } catch {
      // transient failure, allow retry later on online/visibility
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}
